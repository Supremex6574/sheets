"use client";

import { useEffect, useRef } from "react";
import {
  joinDocument,
  subscribeToPresence,
  updateSelectedCell as firebaseUpdateSelectedCell,
} from "../lib/presence";
import type { PresenceUser } from "../types";

interface UsePresenceReturn {
  updateSelectedCell: (cellId: string | null) => void;
}

export function usePresence(
  docId: string,
  uid: string | null,
  displayName: string | null,
  onUsersChange: (users: PresenceUser[]) => void
): UsePresenceReturn {
  const leaveRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (!docId || !uid || !displayName) return;

    const { leave } = joinDocument(docId, uid, displayName);
    leaveRef.current = leave;

    const unsubPresence = subscribeToPresence(docId, onUsersChange);

    return () => {
      leave().catch(console.error);
      unsubPresence();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, uid, displayName]);

  const updateSelectedCell = (cellId: string | null): void => {
    if (!docId || !uid) return;
    firebaseUpdateSelectedCell(docId, uid, cellId);
  };

  return { updateSelectedCell };
}
