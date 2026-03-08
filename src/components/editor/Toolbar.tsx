"use client";

import { useSpreadsheetStore } from "../../store/spreadsheetStore";
import { exportToCSV, exportToJSON, downloadFile } from "../../utils/exportUtils";
import type { CellData } from "../../types";

interface ToolbarProps {
  onFormatChange: (cellId: string, updatedCell: CellData) => void;
}

const COLORS = [
  "#FF6B6B", "#FF9F43", "#FFEAA7", "#55EFC4", "#74B9FF",
  "#A29BFE", "#FD79A8", "#FFFFFF", "#B2BEC3", "#636E72",
];

export function Toolbar({ onFormatChange }: ToolbarProps) {
  const selectedCell = useSpreadsheetStore((s) => s.selectedCell);
  const cells = useSpreadsheetStore((s) => s.cells);
  const setCellFormat = useSpreadsheetStore((s) => s.setCellFormat);

  const currentFormat = selectedCell ? cells[selectedCell]?.format : undefined;
  const isBold = currentFormat?.bold ?? false;
  const isItalic = currentFormat?.italic ?? false;

  const applyFormat = (patch: Parameters<typeof setCellFormat>[1]) => {
    if (!selectedCell) return;
    setCellFormat(selectedCell, patch);
    const updated: CellData = {
      ...(cells[selectedCell] ?? { id: selectedCell, raw: "", computed: null }),
      format: {
        ...(cells[selectedCell]?.format ?? {}),
        ...patch,
      },
    };
    onFormatChange(selectedCell, updated);
  };

  const handleExportCSV = () => {
    const csv = exportToCSV(cells);
    downloadFile(csv, "spreadsheet.csv", "text/csv");
  };

  const handleExportJSON = () => {
    const json = exportToJSON(cells);
    downloadFile(json, "spreadsheet.json", "application/json");
  };

  return (
    <div className="flex items-center gap-1 px-3 h-10 border-b border-white/[0.06] bg-[#0c0c17] shrink-0 overflow-x-auto">
      {/* Bold */}
      <ToolButton
        active={isBold}
        onClick={() => applyFormat({ bold: !isBold })}
        title="Bold (Ctrl+B)"
      >
        <span className="font-bold text-sm">B</span>
      </ToolButton>

      {/* Italic */}
      <ToolButton
        active={isItalic}
        onClick={() => applyFormat({ italic: !isItalic })}
        title="Italic (Ctrl+I)"
      >
        <span className="italic text-sm">I</span>
      </ToolButton>

      <Divider />

      {/* Alignment */}
      <ToolButton
        active={currentFormat?.align === "left"}
        onClick={() => applyFormat({ align: "left" })}
        title="Align left"
      >
        <AlignLeftIcon />
      </ToolButton>
      <ToolButton
        active={currentFormat?.align === "center"}
        onClick={() => applyFormat({ align: "center" })}
        title="Align center"
      >
        <AlignCenterIcon />
      </ToolButton>
      <ToolButton
        active={currentFormat?.align === "right"}
        onClick={() => applyFormat({ align: "right" })}
        title="Align right"
      >
        <AlignRightIcon />
      </ToolButton>

      <Divider />

      {/* Text color */}
      <div className="relative group">
        <ToolButton active={false} onClick={() => {}} title="Text color">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-bold leading-none">A</span>
            <div
              className="w-3 h-0.5 rounded-full"
              style={{ backgroundColor: currentFormat?.textColor ?? "#ffffff" }}
            />
          </div>
        </ToolButton>
        <div className="absolute top-full mt-1 left-0 hidden group-hover:flex flex-wrap w-28 gap-1 bg-[#1a1a2e] border border-white/10 rounded-xl p-2 z-50 shadow-xl">
          {COLORS.map((c) => (
            <button
              key={c}
              className="w-5 h-5 rounded-full hover:scale-110 transition-transform border border-white/10"
              style={{ backgroundColor: c }}
              onClick={() => applyFormat({ textColor: c })}
            />
          ))}
        </div>
      </div>

      {/* Background color */}
      <div className="relative group">
        <ToolButton active={false} onClick={() => {}} title="Cell background">
          <div className="flex flex-col items-center gap-0.5">
            <PaintBucketIcon />
            <div
              className="w-3 h-0.5 rounded-full"
              style={{
                backgroundColor: currentFormat?.bgColor ?? "transparent",
                border: currentFormat?.bgColor ? "none" : "1px solid rgba(255,255,255,0.3)",
              }}
            />
          </div>
        </ToolButton>
        <div className="absolute top-full mt-1 left-0 hidden group-hover:flex flex-wrap w-28 gap-1 bg-[#1a1a2e] border border-white/10 rounded-xl p-2 z-50 shadow-xl">
          <button
            className="w-5 h-5 rounded-full hover:scale-110 transition-transform border border-white/20 bg-transparent flex items-center justify-center"
            onClick={() => applyFormat({ bgColor: undefined })}
          >
            <span className="text-white/40 text-[8px]">✕</span>
          </button>
          {COLORS.map((c) => (
            <button
              key={c}
              className="w-5 h-5 rounded-full hover:scale-110 transition-transform border border-white/10"
              style={{ backgroundColor: c }}
              onClick={() => applyFormat({ bgColor: c })}
            />
          ))}
        </div>
      </div>

      <div className="flex-1" />

      <Divider />

      {/* Export */}
      <div className="relative group">
        <ToolButton active={false} onClick={() => {}} title="Export">
          <div className="flex items-center gap-1">
            <ExportIcon />
            <span className="text-[10px] text-white/50">Export</span>
          </div>
        </ToolButton>
        <div className="absolute top-full right-0 mt-1 hidden group-hover:flex flex-col bg-[#1a1a2e] border border-white/10 rounded-xl overflow-hidden z-50 shadow-xl min-w-[120px]">
          <button
            className="px-4 py-2.5 text-xs text-white/70 hover:bg-white/5 hover:text-white text-left transition-colors"
            onClick={handleExportCSV}
          >
            Export as CSV
          </button>
          <button
            className="px-4 py-2.5 text-xs text-white/70 hover:bg-white/5 hover:text-white text-left transition-colors"
            onClick={handleExportJSON}
          >
            Export as JSON
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ToolButton({
  children,
  active,
  onClick,
  title,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`h-7 min-w-[28px] px-1.5 rounded-md flex items-center justify-center transition-all text-xs select-none ${
        active
          ? "bg-[#00d4ff]/20 text-[#00d4ff]"
          : "text-white/40 hover:bg-white/5 hover:text-white/70"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-white/10 mx-1" />;
}

function AlignLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="2" width="12" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="1" y="5.5" width="8" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="1" y="9" width="10" height="1.5" rx="0.75" fill="currentColor" />
    </svg>
  );
}

function AlignCenterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="2" width="12" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="3" y="5.5" width="8" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="2" y="9" width="10" height="1.5" rx="0.75" fill="currentColor" />
    </svg>
  );
}

function AlignRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="2" width="12" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="5" y="5.5" width="8" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="3" y="9" width="10" height="1.5" rx="0.75" fill="currentColor" />
    </svg>
  );
}

function PaintBucketIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M7.5 1.5L10.5 4.5L5.5 9.5H2.5V6.5L7.5 1.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="9.5" cy="9.5" r="1.5" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M6 1v6M3.5 4.5L6 7l2.5-2.5M2 9h8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
