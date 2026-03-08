import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  type Unsubscribe,
  type DocumentReference,
  type FieldValue,
} from "firebase/firestore";
import { db } from "./firebase";
import type { DocumentMeta, CellData, ColMeta, RowMeta } from "../types";

// ─── Documents ────────────────────────────────────────────────────────────────

export async function createDocument(
  uid: string,
  displayName: string,
  title = "Untitled Spreadsheet"
): Promise<string> {
  const ref = await addDoc(collection(db, "documents"), {
    title,
    ownerId: uid,
    ownerName: displayName,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return ref.id;
}

export async function getDocument(
  docId: string
): Promise<DocumentMeta | null> {
  const snap = await getDoc(doc(db, "documents", docId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as DocumentMeta;
}

export function subscribeToDocumentMeta(
  docId: string,
  cb: (meta: DocumentMeta) => void
): Unsubscribe {
  return onSnapshot(doc(db, "documents", docId), (snap) => {
    if (snap.exists()) cb({ id: snap.id, ...snap.data() } as DocumentMeta);
  });
}

export async function updateDocumentTitle(
  docId: string,
  title: string
): Promise<void> {
  await updateDoc(doc(db, "documents", docId), {
    title,
    updatedAt: Date.now(),
  });
}

export function subscribeToUserDocuments(
  uid: string,
  cb: (docs: DocumentMeta[]) => void
): Unsubscribe {
  const q = query(collection(db, "documents"), orderBy("updatedAt", "desc"));
  return onSnapshot(q, (snap) => {
    const docs = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as DocumentMeta))
      .filter((d) => d.ownerId === uid);
    cb(docs);
  });
}

// ─── Cells ────────────────────────────────────────────────────────────────────

export async function upsertCell(
  docId: string,
  cell: CellData
): Promise<void> {
  const ref = doc(
    db,
    "documents",
    docId,
    "cells",
    cell.id
  ) as DocumentReference<CellData>;

  // Remove undefined fields — Firestore doesn't accept them
  const clean: Record<string, unknown> = {
    id: cell.id,
    raw: cell.raw,
    computed: cell.computed ?? null,
  };
  if (cell.format) clean.format = cell.format;

  await setDoc(ref, clean, { merge: true });
  await updateDoc(doc(db, "documents", docId), { updatedAt: Date.now() });
}

export async function getAllCells(
  docId: string
): Promise<Record<string, CellData>> {
  const snap = await getDocs(collection(db, "documents", docId, "cells"));
  const result: Record<string, CellData> = {};
  snap.forEach((d) => {
    result[d.id] = d.data() as CellData;
  });
  return result;
}

export function subscribeToCell(
  docId: string,
  cellId: string,
  cb: (cell: CellData | null) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, "documents", docId, "cells", cellId),
    (snap) => {
      cb(snap.exists() ? (snap.data() as CellData) : null);
    }
  );
}

export function subscribeToCells(
  docId: string,
  cb: (cells: Record<string, CellData>) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, "documents", docId, "cells"),
    (snap) => {
      const result: Record<string, CellData> = {};
      snap.forEach((d) => {
        result[d.id] = d.data() as CellData;
      });
      cb(result);
    }
  );
}

// ─── Sheet Meta (col/row sizes, col order) ────────────────────────────────────

interface SheetMeta {
  colMeta?: Record<string, ColMeta>;
  rowMeta?: Record<string, RowMeta>;
  colOrder?: number[];
  updatedAt?: number | FieldValue;
}

export async function getSheetMeta(docId: string): Promise<SheetMeta> {
  const snap = await getDoc(doc(db, "documents", docId, "meta", "sheet"));
  return snap.exists() ? (snap.data() as SheetMeta) : {};
}

export async function updateSheetMeta(
  docId: string,
  patch: Partial<SheetMeta>
): Promise<void> {
  await setDoc(
    doc(db, "documents", docId, "meta", "sheet"),
    { ...patch, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export function subscribeToSheetMeta(
  docId: string,
  cb: (meta: SheetMeta) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, "documents", docId, "meta", "sheet"),
    (snap) => {
      cb(snap.exists() ? (snap.data() as SheetMeta) : {});
    }
  );
}
