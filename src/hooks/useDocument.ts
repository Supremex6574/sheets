"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSpreadsheetStore } from "../store/spreadsheetStore";
import {
  subscribeToCells,
  subscribeToSheetMeta,
  subscribeToDocumentMeta,
  upsertCell,
  updateSheetMeta,
} from "../lib/firestore";
import type { CellData, ColMeta, RowMeta, DocumentMeta } from "../types";

interface UseDocumentReturn {
  saveCell: (cell: CellData) => Promise<void>;
  saveColMeta: (colMeta: Record<number, ColMeta>) => Promise<void>;
  saveRowMeta: (rowMeta: Record<number, RowMeta>) => Promise<void>;
  saveColOrder: (order: number[]) => Promise<void>;
}

export function useDocument(
  docId: string,
  onMetaLoaded?: (meta: DocumentMeta) => void
): UseDocumentReturn {
  const { setCells, setColMeta, setRowMeta, setColOrder, addPendingWrite, removePendingWrite, setSyncStatus } =
    useSpreadsheetStore();

  // Track remote cell writes to avoid re-processing our own writes
  const localWriteIds = useRef<Set<string>>(new Set());

  // ── Subscriptions ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!docId) return;

    const unsubCells = subscribeToCells(docId, (remoteCells) => {
      setCells(remoteCells);
    });

    const unsubMeta = subscribeToSheetMeta(docId, (meta) => {
      if (meta.colMeta) {
        const parsed: Record<number, ColMeta> = {};
        Object.entries(meta.colMeta).forEach(([k, v]) => {
          parsed[parseInt(k, 10)] = v;
        });
        setColMeta(parsed);
      }
      if (meta.rowMeta) {
        const parsed: Record<number, RowMeta> = {};
        Object.entries(meta.rowMeta).forEach(([k, v]) => {
          parsed[parseInt(k, 10)] = v;
        });
        setRowMeta(parsed);
      }
      if (meta.colOrder) setColOrder(meta.colOrder);
    });

    const unsubDocMeta = subscribeToDocumentMeta(docId, (meta) => {
      onMetaLoaded?.(meta);
    });

    return () => {
      unsubCells();
      unsubMeta();
      unsubDocMeta();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  // ── Write helpers ──────────────────────────────────────────────────────────

 const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const saveCell = useCallback(
    async (cell: CellData): Promise<void> => {
      const writeId = cell.id;
      addPendingWrite(writeId);

      // Debounce — wait 600ms after last change before writing
      if (saveTimers.current[writeId]) {
        clearTimeout(saveTimers.current[writeId]);
      }

      saveTimers.current[writeId] = setTimeout(async () => {
        try {
          await upsertCell(docId, cell);
          removePendingWrite(writeId);
        } catch (err) {
          console.error("Failed to save cell", err);
          setSyncStatus("error");
        } finally {
          delete saveTimers.current[writeId];
        }
      }, 600);
    },
    [docId, addPendingWrite, removePendingWrite, setSyncStatus]
  );
  const saveColMeta = useCallback(
    async (colMeta: Record<number, ColMeta>): Promise<void> => {
      try {
        // Firestore keys must be strings
        const serialised: Record<string, ColMeta> = {};
        Object.entries(colMeta).forEach(([k, v]) => { serialised[k] = v; });
        await updateSheetMeta(docId, { colMeta: serialised as unknown as Record<number, ColMeta> });
      } catch (err) {
        console.error("Failed to save col meta", err);
      }
    },
    [docId]
  );

  const saveRowMeta = useCallback(
    async (rowMeta: Record<number, RowMeta>): Promise<void> => {
      try {
        const serialised: Record<string, RowMeta> = {};
        Object.entries(rowMeta).forEach(([k, v]) => { serialised[k] = v; });
        await updateSheetMeta(docId, { rowMeta: serialised as unknown as Record<number, RowMeta> });
      } catch (err) {
        console.error("Failed to save row meta", err);
      }
    },
    [docId]
  );

  const saveColOrder = useCallback(
    async (order: number[]): Promise<void> => {
      try {
        await updateSheetMeta(docId, { colOrder: order });
      } catch (err) {
        console.error("Failed to save col order", err);
      }
    },
    [docId]
  );

  return { saveCell, saveColMeta, saveRowMeta, saveColOrder };
}
