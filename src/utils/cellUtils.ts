import type { CellAddress } from "../types";

/**
 * Convert column index (0-based) to letter(s): 0 → "A", 25 → "Z", 26 → "AA"
 */
export function colIndexToLetter(col: number): string {
  let result = "";
  let n = col + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

/**
 * Convert column letter(s) to 0-based index: "A" → 0, "Z" → 25, "AA" → 26
 */
export function colLetterToIndex(col: string): number {
  let result = 0;
  for (let i = 0; i < col.length; i++) {
    result = result * 26 + col.charCodeAt(i) - 64;
  }
  return result - 1;
}

/**
 * Convert CellAddress to cell ID string: { col: 0, row: 0 } → "A1"
 */
export function addressToId(addr: CellAddress): string {
  return `${colIndexToLetter(addr.col)}${addr.row + 1}`;
}

/**
 * Parse cell ID string to CellAddress: "A1" → { col: 0, row: 0 }
 */
export function idToAddress(id: string): CellAddress {
  const match = id.match(/^([A-Z]+)(\d+)$/);
  if (!match) throw new Error(`Invalid cell ID: ${id}`);
  return {
    col: colLetterToIndex(match[1]),
    row: parseInt(match[2], 10) - 1,
  };
}

/**
 * Validate that a string is a valid cell ID
 */
export function isValidCellId(id: string): boolean {
  return /^[A-Z]+[1-9]\d*$/.test(id);
}

/**
 * Expand a range string "A1:C3" into an array of cell IDs
 */
export function expandRange(rangeStr: string): string[] {
  const parts = rangeStr.split(":");
  if (parts.length !== 2) return [];

  try {
    const start = idToAddress(parts[0]);
    const end = idToAddress(parts[1]);

    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);

    const ids: string[] = [];
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        ids.push(addressToId({ col: c, row: r }));
      }
    }
    return ids;
  } catch {
    return [];
  }
}

/**
 * Default column width
 */
export const DEFAULT_COL_WIDTH = 120;
export const DEFAULT_ROW_HEIGHT = 32;
export const MIN_COL_WIDTH = 40;
export const MIN_ROW_HEIGHT = 24;
export const MAX_COLS = 26;
export const MAX_ROWS = 100;
