"use client";

import { type KeyboardEvent, useEffect, useRef } from "react";
import { useSpreadsheetStore } from "../../store/spreadsheetStore";

interface FormulaBarProps {
  onCommit: (value: string) => void;
  onCancel: () => void;
}

export function FormulaBar({ onCommit, onCancel }: FormulaBarProps) {
  const selectedCell = useSpreadsheetStore((s) => s.selectedCell);
  const editingCell = useSpreadsheetStore((s) => s.editingCell);
  const editingValue = useSpreadsheetStore((s) => s.editingValue);
  const cells = useSpreadsheetStore((s) => s.cells);
  const setEditingCell = useSpreadsheetStore((s) => s.setEditingCell);
  const setEditingValue = useSpreadsheetStore((s) => s.setEditingValue);

  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue =
    editingCell === selectedCell
      ? editingValue
      : (selectedCell ? (cells[selectedCell]?.raw ?? "") : "");

  const isFormula = displayValue.startsWith("=");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onCommit(e.currentTarget.value);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  const handleFocus = () => {
    if (selectedCell && editingCell !== selectedCell) {
      setEditingCell(selectedCell, cells[selectedCell]?.raw ?? "");
    }
  };

  return (
    <div className="flex items-center gap-0 border-b border-white/[0.06] bg-[#0f0f1a] h-9 shrink-0">
      {/* Cell address box */}
      <div className="w-20 shrink-0 h-full flex items-center justify-center border-r border-white/[0.06] text-white/50 text-xs font-mono">
        {selectedCell ?? "—"}
      </div>

      {/* Formula icon */}
      <div className="w-8 shrink-0 h-full flex items-center justify-center border-r border-white/[0.06]">
        <span
          className={`text-xs font-mono select-none ${
            isFormula ? "text-[#00d4ff]" : "text-white/20"
          }`}
        >
          fx
        </span>
      </div>

      {/* Formula input */}
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={(e) => {
          if (selectedCell) {
            if (editingCell !== selectedCell) {
              setEditingCell(selectedCell, e.target.value);
            } else {
              setEditingValue(e.target.value);
            }
          }
        }}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={selectedCell ? "Enter value or formula (=SUM, =A1+B2, ...)" : "Select a cell"}
        className="flex-1 h-full bg-transparent text-white/80 text-xs font-mono px-3 focus:outline-none placeholder-white/10"
      />
    </div>
  );
}
