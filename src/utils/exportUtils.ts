import type { CellData } from "../types";
import { colIndexToLetter, MAX_COLS, MAX_ROWS } from "./cellUtils";

/**
 * Convert sheet cells to a 2D array (row-major)
 */
export function cellsTo2DArray(
  cells: Record<string, CellData>,
  rows = MAX_ROWS,
  cols = MAX_COLS
): (string | number | null)[][] {
  const grid: (string | number | null)[][] = Array.from({ length: rows }, () =>
    Array<null>(cols).fill(null)
  );

  for (const [id, cell] of Object.entries(cells)) {
    const match = id.match(/^([A-Z]+)(\d+)$/);
    if (!match) continue;
    const col = letterToIndex(match[1]);
    const row = parseInt(match[2], 10) - 1;
    if (row >= 0 && row < rows && col >= 0 && col < cols) {
      grid[row][col] = cell.computed ?? cell.raw;
    }
  }

  // Trim trailing empty rows
  let lastRow = 0;
  for (let r = rows - 1; r >= 0; r--) {
    if (grid[r].some((v) => v !== null)) { lastRow = r; break; }
  }

  return grid.slice(0, lastRow + 1);
}

function letterToIndex(col: string): number {
  let result = 0;
  for (let i = 0; i < col.length; i++) {
    result = result * 26 + col.charCodeAt(i) - 64;
  }
  return result - 1;
}

/**
 * Export as CSV string
 */
export function exportToCSV(cells: Record<string, CellData>): string {
  const grid = cellsTo2DArray(cells);
  return grid
    .map((row) =>
      row
        .map((v) => {
          const s = String(v ?? "");
          // Escape cells containing commas, quotes, or newlines
          if (s.includes(",") || s.includes('"') || s.includes("\n")) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        })
        .join(",")
    )
    .join("\n");
}

/**
 * Export as JSON (array of objects with column letters as keys)
 */
export function exportToJSON(cells: Record<string, CellData>): string {
  const grid = cellsTo2DArray(cells);
  if (grid.length === 0) return "[]";

  const maxCols = Math.max(...grid.map((r) => r.length));
  const headers = Array.from({ length: maxCols }, (_, i) =>
    colIndexToLetter(i)
  );

  const rows = grid.map((row) => {
    const obj: Record<string, string | number | null> = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? null;
    });
    return obj;
  });

  return JSON.stringify(rows, null, 2);
}

/**
 * Trigger browser file download
 */
export function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
