"use client";

import {
  useRef,
  useCallback,
  useEffect,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type DragEvent,
} from "react";
import { useSpreadsheetStore } from "../../store/spreadsheetStore";
import {
  colIndexToLetter,
  DEFAULT_COL_WIDTH,
  DEFAULT_ROW_HEIGHT,
  MAX_COLS,
  MAX_ROWS,
  MIN_COL_WIDTH,
  MIN_ROW_HEIGHT,
  addressToId,
} from "../../utils/cellUtils";
import type { CellData, PresenceUser } from "../../types";

interface GridProps {
  onCellCommit: (cell: CellData) => void;
  onColMetaChange: () => void;
  onRowMetaChange: () => void;
  onColOrderChange: () => void;
  presenceUsers: PresenceUser[];
  currentUid: string;
}

const CORNER_WIDTH = 48;
const HEADER_HEIGHT = 28;

export function Grid({
  onCellCommit,
  onColMetaChange,
  onRowMetaChange,
  onColOrderChange,
  presenceUsers,
  currentUid,
}: GridProps) {
  const {
    cells,
    colMeta,
    rowMeta,
    colOrder,
    selectedCell,
    editingCell,
    editingValue,
    setSelectedCell,
    setEditingCell,
    setEditingValue,
    commitEdit,
    cancelEdit,
    moveSelection,
    setColWidth,
    setRowHeight,
    reorderCol,
  } = useSpreadsheetStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const cellInputRef = useRef<HTMLInputElement>(null);

  // Column resize state
  const colResizeRef = useRef<{
    colIdx: number;
    startX: number;
    startWidth: number;
  } | null>(null);

  // Row resize state
  const rowResizeRef = useRef<{
    rowIdx: number;
    startY: number;
    startHeight: number;
  } | null>(null);

  // Column drag-reorder state
  const [dragCol, setDragCol] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  // ── Derived sizing ─────────────────────────────────────────────────────────

  const getColWidth = useCallback(
    (displayIdx: number): number =>
      colMeta[colOrder[displayIdx]]?.width ?? DEFAULT_COL_WIDTH,
    [colMeta, colOrder]
  );

  const getRowHeight = useCallback(
    (rowIdx: number): number => rowMeta[rowIdx]?.height ?? DEFAULT_ROW_HEIGHT,
    [rowMeta]
  );

  const colOffsets = (() => {
    const offsets: number[] = [CORNER_WIDTH];
    for (let i = 0; i < MAX_COLS; i++) {
      offsets.push(offsets[i] + getColWidth(i));
    }
    return offsets;
  })();

  const rowOffsets = (() => {
    const offsets: number[] = [HEADER_HEIGHT];
    for (let i = 0; i < MAX_ROWS; i++) {
      offsets.push(offsets[i] + getRowHeight(i));
    }
    return offsets;
  })();

  const totalWidth = colOffsets[MAX_COLS];
  const totalHeight = rowOffsets[MAX_ROWS];

  // ── Presence helpers ───────────────────────────────────────────────────────

  const userOnCell = useCallback(
    (cellId: string): PresenceUser | undefined =>
      presenceUsers.find((u) => u.uid !== currentUid && u.selectedCell === cellId),
    [presenceUsers, currentUid]
  );

  // ── Keyboard navigation ────────────────────────────────────────────────────

  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (editingCell) return;

      // Ctrl+B / Ctrl+I formatting
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        if (selectedCell) {
          const s = useSpreadsheetStore.getState();
          const cur = s.cells[selectedCell]?.format?.bold ?? false;
          s.setCellFormat(selectedCell, { bold: !cur });
          const updated: CellData = {
            ...(s.cells[selectedCell] ?? { id: selectedCell, raw: "", computed: null }),
            format: { ...s.cells[selectedCell]?.format, bold: !cur },
          };
          onCellCommit(updated);
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "i") {
        e.preventDefault();
        if (selectedCell) {
          const s = useSpreadsheetStore.getState();
          const cur = s.cells[selectedCell]?.format?.italic ?? false;
          s.setCellFormat(selectedCell, { italic: !cur });
          const updated: CellData = {
            ...(s.cells[selectedCell] ?? { id: selectedCell, raw: "", computed: null }),
            format: { ...s.cells[selectedCell]?.format, italic: !cur },
          };
          onCellCommit(updated);
        }
        return;
      }

      if (!selectedCell) return;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          moveSelection(0, -1);
          break;
        case "ArrowDown":
          e.preventDefault();
          moveSelection(0, 1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          moveSelection(-1, 0);
          break;
        case "ArrowRight":
          e.preventDefault();
          moveSelection(1, 0);
          break;
        case "Tab":
          e.preventDefault();
          moveSelection(e.shiftKey ? -1 : 1, 0);
          break;
        case "Delete":
        case "Backspace":
          if (cells[selectedCell]?.raw) {
            const s = useSpreadsheetStore.getState();
            s.setCellRaw(selectedCell, "");
            onCellCommit({ id: selectedCell, raw: "", computed: null, format: s.cells[selectedCell]?.format });
          }
          break;
        case "Escape":
          cancelEdit();
          break;
        default:
          // Printable character starts editing
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            setEditingCell(selectedCell, e.key);
          }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingCell, selectedCell, cells]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell) {
      setTimeout(() => cellInputRef.current?.focus(), 0);
    }
  }, [editingCell]);

  // ── Cell commit ─────────────────────────────────────────────────────────────

  const handleCommit = useCallback(() => {
    const cell = commitEdit();
    if (cell) {
      onCellCommit(cell);
    }
  }, [commitEdit, onCellCommit]);

  const handleCellKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCommit();
      moveSelection(0, 1);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
    if (e.key === "Tab") {
      e.preventDefault();
      handleCommit();
      moveSelection(e.shiftKey ? -1 : 1, 0);
    }
    if (e.key === "ArrowUp" && !editingValue.startsWith("=")) {
      e.preventDefault();
      handleCommit();
      moveSelection(0, -1);
    }
    if (e.key === "ArrowDown" && !editingValue.startsWith("=")) {
      e.preventDefault();
      handleCommit();
      moveSelection(0, 1);
    }
  };

  // ── Column resize ──────────────────────────────────────────────────────────

  const startColResize = useCallback(
    (e: MouseEvent, colDisplayIdx: number) => {
      e.preventDefault();
      e.stopPropagation();
      colResizeRef.current = {
        colIdx: colDisplayIdx,
        startX: e.clientX,
        startWidth: getColWidth(colDisplayIdx),
      };

      const onMove = (ev: globalThis.MouseEvent) => {
        if (!colResizeRef.current) return;
        const { colIdx, startX, startWidth } = colResizeRef.current;
        const newWidth = Math.max(MIN_COL_WIDTH, startWidth + ev.clientX - startX);
        setColWidth(colOrder[colIdx], newWidth);
      };

      const onUp = () => {
        colResizeRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        onColMetaChange();
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [getColWidth, setColWidth, colOrder, onColMetaChange]
  );

  // ── Row resize ─────────────────────────────────────────────────────────────

  const startRowResize = useCallback(
    (e: MouseEvent, rowIdx: number) => {
      e.preventDefault();
      e.stopPropagation();
      rowResizeRef.current = {
        rowIdx,
        startY: e.clientY,
        startHeight: getRowHeight(rowIdx),
      };

      const onMove = (ev: globalThis.MouseEvent) => {
        if (!rowResizeRef.current) return;
        const { rowIdx: ri, startY, startHeight } = rowResizeRef.current;
        const newHeight = Math.max(MIN_ROW_HEIGHT, startHeight + ev.clientY - startY);
        setRowHeight(ri, newHeight);
      };

      const onUp = () => {
        rowResizeRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        onRowMetaChange();
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [getRowHeight, setRowHeight, onRowMetaChange]
  );

  // ── Column drag reorder ────────────────────────────────────────────────────

  const handleColDragStart = (e: DragEvent, displayIdx: number) => {
    setDragCol(displayIdx);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleColDragOver = (e: DragEvent, displayIdx: number) => {
    e.preventDefault();
    setDropTarget(displayIdx);
  };

  const handleColDrop = (e: DragEvent, displayIdx: number) => {
    e.preventDefault();
    if (dragCol !== null && dragCol !== displayIdx) {
      reorderCol(dragCol, displayIdx);
      onColOrderChange();
    }
    setDragCol(null);
    setDropTarget(null);
  };

  const handleColDragEnd = () => {
    setDragCol(null);
    setDropTarget(null);
  };

  // ── Cell display ───────────────────────────────────────────────────────────

  const getCellDisplayValue = (cellId: string): string => {
    const cell = cells[cellId];
    if (!cell) return "";
    if (cell.raw.startsWith("=")) {
      const v = cell.computed;
      if (v === null) return "";
      return String(v);
    }
    return cell.raw;
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto relative select-none outline-none"
      style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
      tabIndex={0}
      onBlur={(e) => {
        // Only commit if focus is leaving the grid entirely
        if (
          editingCell &&
          !containerRef.current?.contains(e.relatedTarget as Node)
        ) {
          handleCommit();
        }
      }}
    >
      <div
        className="relative"
        style={{ width: totalWidth, height: totalHeight }}
      >
        {/* ── Corner ─────────────────────────────────────────────────────── */}
        <div
          className="sticky top-0 left-0 z-30 bg-[#0c0c17] border-r border-b border-white/[0.06]"
          style={{ width: CORNER_WIDTH, height: HEADER_HEIGHT }}
        />

        {/* ── Column headers ─────────────────────────────────────────────── */}
        <div
          className="sticky top-0 z-20 flex"
          style={{ marginLeft: CORNER_WIDTH, height: HEADER_HEIGHT }}
        >
          {Array.from({ length: MAX_COLS }, (_, displayIdx) => {
            const colIdx = colOrder[displayIdx];
            const letter = colIndexToLetter(colIdx);
            const width = getColWidth(displayIdx);
            const isDragging = dragCol === displayIdx;
            const isDropTarget = dropTarget === displayIdx;

            return (
              <div
                key={displayIdx}
                className={`relative shrink-0 flex items-center justify-center text-[11px] font-medium cursor-grab active:cursor-grabbing border-r border-b border-white/[0.06] transition-colors
                  ${isDragging ? "opacity-50" : ""}
                  ${isDropTarget ? "bg-[#00d4ff]/10" : "bg-[#0c0c17] hover:bg-white/[0.03]"}
                `}
                style={{ width }}
                draggable
                onDragStart={(e) => handleColDragStart(e, displayIdx)}
                onDragOver={(e) => handleColDragOver(e, displayIdx)}
                onDrop={(e) => handleColDrop(e, displayIdx)}
                onDragEnd={handleColDragEnd}
              >
                <span className="text-white/40 select-none">{letter}</span>

                {/* Resize handle */}
                <div
                  className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-[#00d4ff]/60 z-10"
                  onMouseDown={(e) => startColResize(e, displayIdx)}
                />
              </div>
            );
          })}
        </div>

        {/* ── Row headers + cells ─────────────────────────────────────────── */}
        {Array.from({ length: MAX_ROWS }, (_, rowIdx) => {
          const rowHeight = getRowHeight(rowIdx);
          const top = rowOffsets[rowIdx];

          return (
            <div
              key={rowIdx}
              className="absolute flex"
              style={{ top, left: 0, height: rowHeight, width: totalWidth }}
            >
              {/* Row number */}
              <div
                className="sticky left-0 z-10 shrink-0 flex items-center justify-center text-[11px] text-white/30 bg-[#0c0c17] border-r border-b border-white/[0.06] relative cursor-row-resize select-none"
                style={{ width: CORNER_WIDTH, height: rowHeight }}
              >
                <span>{rowIdx + 1}</span>
                {/* Row resize handle */}
                <div
                  className="absolute bottom-0 left-0 w-full h-1 cursor-row-resize hover:bg-[#00d4ff]/40 z-10"
                  onMouseDown={(e) => startRowResize(e, rowIdx)}
                />
              </div>

              {/* Cells */}
              {Array.from({ length: MAX_COLS }, (_, displayIdx) => {
                const colIdx = colOrder[displayIdx];
                const cellId = addressToId({ col: colIdx, row: rowIdx });
                const width = getColWidth(displayIdx);
                const cell = cells[cellId];
                const fmt = cell?.format;
                const isSelected = selectedCell === cellId;
                const isEditing = editingCell === cellId;
                const presenceUser = userOnCell(cellId);
                const displayValue = getCellDisplayValue(cellId);

                return (
                  <div
                    key={displayIdx}
                    className={`relative shrink-0 border-r border-b border-white/[0.06] overflow-hidden
                      ${isSelected && !isEditing ? "ring-2 ring-inset ring-[#00d4ff] z-[1]" : ""}
                    `}
                    style={{
                      width,
                      height: rowHeight,
                      backgroundColor: fmt?.bgColor
                        ? fmt.bgColor
                        : isSelected
                        ? "rgba(0,212,255,0.05)"
                        : "transparent",
                    }}
                    onClick={() => {
                      if (isEditing) return;
                      setSelectedCell(cellId);
                    }}
                    onDoubleClick={() => {
                      setEditingCell(cellId);
                    }}
                  >
                    {/* Presence indicator */}
                    {presenceUser && (
                      <div
                        className="absolute inset-0 ring-2 ring-inset z-[2] pointer-events-none"
                        style={{ borderColor: presenceUser.color }}
                      />
                    )}
                    {presenceUser && (
                      <div
                        className="absolute top-0 right-0 w-2 h-2 z-[3] pointer-events-none"
                        style={{ backgroundColor: presenceUser.color }}
                      />
                    )}

                    {isEditing ? (
                      <input
                        ref={cellInputRef}
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onKeyDown={handleCellKeyDown}
                        onBlur={handleCommit}
                        className="absolute inset-0 w-full h-full px-1.5 bg-[#1a1a35] text-white text-xs outline-none border-2 border-[#00d4ff] font-mono z-[4]"
                        style={{ fontSize: fmt?.fontSize ?? 12 }}
                      />
                    ) : (
                      <div
                        className="absolute inset-0 flex items-center overflow-hidden"
                        style={{
                          paddingLeft: 6,
                          paddingRight: 6,
                          justifyContent:
                            fmt?.align === "center"
                              ? "center"
                              : fmt?.align === "right"
                              ? "flex-end"
                              : "flex-start",
                        }}
                      >
                        <span
                          className="text-xs leading-none truncate"
                          style={{
                            color: fmt?.textColor ?? "rgba(255,255,255,0.75)",
                            fontWeight: fmt?.bold ? 700 : 400,
                            fontStyle: fmt?.italic ? "italic" : "normal",
                            fontSize: fmt?.fontSize ?? 12,
                          }}
                        >
                          {displayValue}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
