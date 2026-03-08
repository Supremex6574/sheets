"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "../../../components/auth/AuthProvider";
import { SignInModal } from "../../../components/auth/SignInModal";
import { Grid } from "../../../components/editor/Grid";
import { FormulaBar } from "../../../components/editor/FormulaBar";
import { Toolbar } from "../../../components/editor/Toolbar";
import { PresenceBar } from "../../../components/editor/PresenceBar";
import { SyncIndicator } from "../../../components/editor/SyncIndicator";
import { useDocument } from "../../../hooks/useDocument";
import { usePresence } from "../../../hooks/usePresence";
import { useSpreadsheetStore } from "../../../store/spreadsheetStore";
import { updateDocumentTitle } from "../../../lib/firestore";
import type { CellData, PresenceUser, DocumentMeta } from "../../../types";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditorPage({ params }: PageProps) {
  const { id: docId } = use(params);
  const { user, loading } = useAuthContext();
  const router = useRouter();

  const [docTitle, setDocTitle] = useState("Untitled Spreadsheet");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);

  const { commitEdit, cancelEdit, setSelectedCell, colMeta, rowMeta, colOrder } =
    useSpreadsheetStore();

  // ── Document sync ──────────────────────────────────────────────────────────

  const onMetaLoaded = useCallback((meta: DocumentMeta) => {
    setDocTitle(meta.title);
  }, []);

  const { saveCell, saveColMeta, saveRowMeta, saveColOrder } = useDocument(
    docId,
    onMetaLoaded
  );

  // ── Presence ───────────────────────────────────────────────────────────────

  const { updateSelectedCell } = usePresence(
    docId,
    user?.uid ?? null,
    user?.displayName ?? null,
    setPresenceUsers
  );

  // Update presence when selected cell changes
  const selectedCell = useSpreadsheetStore((s) => s.selectedCell);
  useEffect(() => {
    updateSelectedCell(selectedCell);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCell]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCellCommit = useCallback(
    async (cell: CellData) => {
      await saveCell(cell);
    },
    [saveCell]
  );

  const handleColMetaChange = useCallback(() => {
    saveColMeta(colMeta).catch(console.error);
  }, [saveColMeta, colMeta]);

  const handleRowMetaChange = useCallback(() => {
    saveRowMeta(rowMeta).catch(console.error);
  }, [saveRowMeta, rowMeta]);

  const handleColOrderChange = useCallback(() => {
    saveColOrder(colOrder).catch(console.error);
  }, [saveColOrder, colOrder]);

  const handleFormulaCommit = useCallback(
    (value: string) => {
      const { editingCell, setEditingValue } = useSpreadsheetStore.getState();
      if (editingCell) {
        setEditingValue(value);
        const cell = commitEdit();
        if (cell) handleCellCommit(cell).catch(console.error);
      }
    },
    [commitEdit, handleCellCommit]
  );

  const handleFormulaCancel = useCallback(() => {
    cancelEdit();
  }, [cancelEdit]);

  const commitTitle = async () => {
    const t = titleDraft.trim() || "Untitled Spreadsheet";
    setDocTitle(t);
    setEditingTitle(false);
    await updateDocumentTitle(docId, t).catch(console.error);
  };

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 border-2 border-[#00d4ff]/30 border-t-[#00d4ff] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !user.displayName) {
    return <SignInModal />;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0f] overflow-hidden">
      {/* ── Top nav ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 h-12 border-b border-white/[0.06] bg-[#0c0c17] shrink-0 z-50">
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo */}
          <Link href="/" className="shrink-0">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#00d4ff] to-[#7c3aed] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.9" />
                <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.5" />
                <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.5" />
                <rect x="8" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.9" />
              </svg>
            </div>
          </Link>

          <div className="w-px h-5 bg-white/[0.08] shrink-0" />

          {/* Editable title */}
          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle();
                if (e.key === "Escape") { setEditingTitle(false); }
              }}
              className="bg-white/5 text-white text-sm font-medium px-2 py-1 rounded-md outline-none border border-[#00d4ff]/40 min-w-0 max-w-[240px]"
            />
          ) : (
            <button
              className="text-white/70 hover:text-white text-sm font-medium transition-colors truncate max-w-[240px]"
              onClick={() => { setTitleDraft(docTitle); setEditingTitle(true); }}
              title="Click to rename"
            >
              {docTitle}
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <SyncIndicator />
          <PresenceBar users={presenceUsers} currentUid={user.uid} />

          {/* User avatar */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00d4ff] to-[#7c3aed] flex items-center justify-center text-[10px] font-bold text-white">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <Toolbar onFormatChange={handleCellCommit} />

      {/* ── Formula bar ──────────────────────────────────────────────────────── */}
      <FormulaBar onCommit={handleFormulaCommit} onCancel={handleFormulaCancel} />

      {/* ── Grid ─────────────────────────────────────────────────────────────── */}
      <Grid
        onCellCommit={handleCellCommit}
        onColMetaChange={handleColMetaChange}
        onRowMetaChange={handleRowMetaChange}
        onColOrderChange={handleColOrderChange}
        presenceUsers={presenceUsers}
        currentUid={user.uid}
      />
    </div>
  );
}
