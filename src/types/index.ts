export interface CellAddress {
  col: number;
  row: number;
}

export interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  textColor?: string;
  bgColor?: string;
  fontSize?: number;
  align?: "left" | "center" | "right";
}

export interface CellData {
  id: string; // e.g. "A1"
  raw: string; // raw input, e.g. "=SUM(A1:A3)" or "42" or "Hello"
  computed: string | number | null; // evaluated value
  format?: CellFormat;
}

export interface ColMeta {
  width: number; // px
}

export interface RowMeta {
  height: number; // px
}

export interface SheetData {
  cells: Record<string, CellData>; // key = "A1", "B3", etc.
  colMeta: Record<number, ColMeta>; // key = col index (0-based)
  rowMeta: Record<number, RowMeta>; // key = row index (0-based)
  colOrder: number[]; // ordered array of column indices for reorder support
}

export interface DocumentMeta {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  createdAt: number;
  updatedAt: number;
}

export interface PresenceUser {
  uid: string;
  displayName: string;
  color: string;
  selectedCell: string | null;
  lastSeen: number;
}

export type SyncStatus = "idle" | "saving" | "saved" | "error";

export interface SelectionRange {
  start: CellAddress;
  end: CellAddress;
}

export type FormulaResult = string | number | null;
