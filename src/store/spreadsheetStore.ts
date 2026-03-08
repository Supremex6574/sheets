"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  CellData,
  CellFormat,
  ColMeta,
  RowMeta,
  SyncStatus,
  SelectionRange,
  CellAddress,
} from "../types";
import { evaluateFormula } from "../utils/formulaParser";
import {
  addressToId,
  DEFAULT_COL_WIDTH,
  DEFAULT_ROW_HEIGHT,
  MAX_COLS,
  MAX_ROWS,
} from "../utils/cellUtils";

export interface SpreadsheetState {
  // Data
  cells: Record<string, CellData>;
  colMeta: Record<number, ColMeta>;
  rowMeta: Record<number, RowMeta>;
  colOrder: number[]; // reorderable column indices

  // UI
  selectedCell: string | null;
  selection: SelectionRange | null;
  editingCell: string | null;
  editingValue: string;
  syncStatus: SyncStatus;
  pendingWrites: Record<string, boolean>;

  // Actions
  setCells: (cells: Record<string, CellData>) => void;
  setColMeta: (meta: Record<number, ColMeta>) => void;
  setRowMeta: (meta: Record<number, RowMeta>) => void;
  setColOrder: (order: number[]) => void;

  setCellRaw: (id: string, raw: string) => void;
  setCellFormat: (id: string, format: Partial<CellFormat>) => void;

  setSelectedCell: (id: string | null) => void;
  setSelection: (range: SelectionRange | null) => void;
  setEditingCell: (id: string | null, initialValue?: string) => void;
  setEditingValue: (value: string) => void;
  commitEdit: () => CellData | null;
  cancelEdit: () => void;

  setSyncStatus: (status: SyncStatus) => void;
  addPendingWrite: (id: string) => void;
  removePendingWrite: (id: string) => void;

  setColWidth: (colIdx: number, width: number) => void;
  setRowHeight: (rowIdx: number, height: number) => void;

  moveSelection: (dCol: number, dRow: number) => void;
  reorderCol: (fromIdx: number, toIdx: number) => void;

  getCellValue: (id: string) => string | number | null;
  evaluateCells: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseAddress(id: string): CellAddress | null {
  const m = id.match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;
  let col = 0;
  for (let i = 0; i < m[1].length; i++) col = col * 26 + m[1].charCodeAt(i) - 64;
  return { col: col - 1, row: parseInt(m[2], 10) - 1 };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSpreadsheetStore = create<SpreadsheetState>()(
  immer((set, get) => ({
    cells: {},
    colMeta: {},
    rowMeta: {},
    colOrder: Array.from({ length: MAX_COLS }, (_, i) => i),

    selectedCell: null,
    selection: null,
    editingCell: null,
    editingValue: "",
    syncStatus: "idle",
    pendingWrites: {},

    // ── Data setters ──────────────────────────────────────────────────────────

    setCells: (cells) => {
      set((s) => {
        s.cells = cells;
      });
      get().evaluateCells();
    },

    setColMeta: (meta) => set((s) => { s.colMeta = meta; }),
    setRowMeta: (meta) => set((s) => { s.rowMeta = meta; }),
    setColOrder: (order) => set((s) => { s.colOrder = order; }),

    setCellRaw: (id, raw) => {
      set((s) => {
        s.cells[id] = {
          id,
          raw,
          computed: null,
          format: s.cells[id]?.format,
        };
      });
      get().evaluateCells();
    },

    setCellFormat: (id, format) => {
      set((s) => {
        const existing = s.cells[id] ?? { id, raw: "", computed: null };
        s.cells[id] = {
          ...existing,
          format: { ...existing.format, ...format },
        };
      });
    },

    // ── Selection / editing ───────────────────────────────────────────────────

    setSelectedCell: (id) =>
      set((s) => {
        s.selectedCell = id;
        s.editingCell = null;
      }),

    setSelection: (range) => set((s) => { s.selection = range; }),

    setEditingCell: (id, initialValue) =>
      set((s) => {
        s.editingCell = id;
        if (id !== null) {
          s.selectedCell = id;
          s.editingValue =
            initialValue !== undefined
              ? initialValue
              : (s.cells[id]?.raw ?? "");
        }
      }),

    setEditingValue: (value) => set((s) => { s.editingValue = value; }),

    commitEdit: () => {
      const { editingCell, editingValue, cells } = get();
      if (!editingCell) return null;

      const cell: CellData = {
        id: editingCell,
        raw: editingValue,
        computed: null,
        format: cells[editingCell]?.format,
      };

      set((s) => {
        s.cells[editingCell] = cell;
        s.editingCell = null;
        s.editingValue = "";
      });

      get().evaluateCells();
      return cell;
    },

    cancelEdit: () =>
      set((s) => {
        s.editingCell = null;
        s.editingValue = "";
      }),

    // ── Sync ──────────────────────────────────────────────────────────────────

    setSyncStatus: (status) => set((s) => { s.syncStatus = status; }),

    addPendingWrite: (id) =>
      set((s) => {
        s.pendingWrites[id] = true;
        s.syncStatus = "saving";
      }),

    removePendingWrite: (id) =>
      set((s) => {
        delete s.pendingWrites[id];
        if (Object.keys(s.pendingWrites).length === 0) s.syncStatus = "saved";
      }),

    // ── Col/row sizing ────────────────────────────────────────────────────────

    setColWidth: (colIdx, width) =>
      set((s) => {
        s.colMeta[colIdx] = { ...s.colMeta[colIdx], width };
      }),

    setRowHeight: (rowIdx, height) =>
      set((s) => {
        s.rowMeta[rowIdx] = { ...s.rowMeta[rowIdx], height };
      }),

    // ── Keyboard navigation ───────────────────────────────────────────────────

    moveSelection: (dCol, dRow) => {
      const { selectedCell } = get();
      if (!selectedCell) return;
      const addr = parseAddress(selectedCell);
      if (!addr) return;
      const newCol = Math.max(0, Math.min(MAX_COLS - 1, addr.col + dCol));
      const newRow = Math.max(0, Math.min(MAX_ROWS - 1, addr.row + dRow));
      const newId = addressToId({ col: newCol, row: newRow });
      set((s) => {
        s.selectedCell = newId;
        s.editingCell = null;
      });
    },

    // ── Column reorder ────────────────────────────────────────────────────────

    reorderCol: (fromIdx, toIdx) => {
      set((s) => {
        const order = [...s.colOrder];
        const [moved] = order.splice(fromIdx, 1);
        order.splice(toIdx, 0, moved);
        s.colOrder = order;
      });
    },

    // ── Formula evaluation ────────────────────────────────────────────────────

    getCellValue: (id: string) => {
      const cell = get().cells[id];
      if (!cell) return null;
      if (!cell.raw.startsWith("=")) {
        const n = parseFloat(cell.raw);
        return isNaN(n) ? cell.raw : n;
      }
      return cell.computed;
    },

    evaluateCells: () => {
      const { cells } = get();
      const resolved: Record<string, string | number | null> = {};

      const resolve = (id: string, visiting: Set<string>): string | number | null => {
        if (id in resolved) return resolved[id];
        if (visiting.has(id)) return "#CIRC!";

        const cell = cells[id];
        if (!cell) return null;

        if (!cell.raw.startsWith("=")) {
          const n = parseFloat(cell.raw);
          const val = isNaN(n) ? cell.raw : n;
          resolved[id] = val;
          return val;
        }

        visiting.add(id);
        const val = evaluateFormula(
          cell.raw,
          (refId) => resolve(refId, new Set(visiting)),
          id
        );
        visiting.delete(id);
        resolved[id] = val;
        return val;
      };

      // Resolve all cells
      for (const id of Object.keys(cells)) {
        resolve(id, new Set());
      }

      set((s) => {
        for (const id of Object.keys(cells)) {
          if (s.cells[id]) {
            s.cells[id].computed = resolved[id] ?? null;
          }
        }
      });
    },
  }))
);
