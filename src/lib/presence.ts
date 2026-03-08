import {
  ref,
  set,
  onDisconnect,
  onValue,
  off,
  serverTimestamp,
  type DatabaseReference,
} from "firebase/database";
import { rtdb } from "./firebase";
import type { PresenceUser } from "../types";

const PRESENCE_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E9",
];

export function getPresenceColor(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length];
}

export function joinDocument(
  docId: string,
  uid: string,
  displayName: string
): { presenceRef: DatabaseReference; leave: () => Promise<void> } {
  const color = getPresenceColor(uid);
  const presenceRef = ref(rtdb, `presence/${docId}/${uid}`);

  const userData: Omit<PresenceUser, "lastSeen"> & { lastSeen: object } = {
    uid,
    displayName,
    color,
    selectedCell: null,
    lastSeen: serverTimestamp() as object,
  };

  set(presenceRef, userData).catch(console.error);

  // Auto-remove on disconnect
  onDisconnect(presenceRef).remove().catch(console.error);

  const leave = async (): Promise<void> => {
    await set(presenceRef, null);
  };

  return { presenceRef, leave };
}

export function updateSelectedCell(
  docId: string,
  uid: string,
  cellId: string | null
): void {
  const presenceRef = ref(rtdb, `presence/${docId}/${uid}/selectedCell`);
  set(presenceRef, cellId).catch(console.error);
}

export function subscribeToPresence(
  docId: string,
  cb: (users: PresenceUser[]) => void
): () => void {
  const presenceRef = ref(rtdb, `presence/${docId}`);

  onValue(presenceRef, (snap) => {
    if (!snap.exists()) {
      cb([]);
      return;
    }
    const users: PresenceUser[] = Object.values(
      snap.val() as Record<string, PresenceUser>
    ).filter(Boolean);
    cb(users);
  });

  return () => off(presenceRef);
}
