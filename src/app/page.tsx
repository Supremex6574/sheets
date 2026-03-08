"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "../components/auth/AuthProvider";
import { SignInModal } from "../components/auth/SignInModal";
import { DocumentCard } from "../components/dashboard/DocumentCard";
import {
  subscribeToUserDocuments,
  createDocument,
} from "../lib/firestore";
import type { DocumentMeta } from "../types";

export default function DashboardPage() {
  const { user, loading, signOut } = useAuthContext();
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [creating, setCreating] = useState(false);
  const [docsLoading, setDocsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToUserDocuments(user.uid, (docs) => {
      setDocuments(docs);
      setDocsLoading(false);
    });
    return unsub;
  }, [user]);

  const handleCreate = async () => {
    if (!user || creating) return;
    setCreating(true);
    try {
      const id = await createDocument(
        user.uid,
        user.displayName ?? "Anonymous"
      );
      router.push(`/doc/${id}`);
    } catch (err) {
      console.error(err);
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#00d4ff]/30 border-t-[#00d4ff] rounded-full animate-spin" />
          <span className="text-white/20 text-sm font-mono">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user || !user.displayName) {
    return <SignInModal />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Background */}
      <div
        className="fixed inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 h-16 border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00d4ff] to-[#7c3aed] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="6" rx="1" fill="white" fillOpacity="0.9" />
              <rect x="9" y="1" width="6" height="6" rx="1" fill="white" fillOpacity="0.5" />
              <rect x="1" y="9" width="6" height="6" rx="1" fill="white" fillOpacity="0.5" />
              <rect x="9" y="9" width="6" height="6" rx="1" fill="white" fillOpacity="0.9" />
            </svg>
          </div>
          <span
            className="font-semibold text-white tracking-tight"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            sheets
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00d4ff] to-[#7c3aed] flex items-center justify-center text-xs font-bold text-white">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <span className="text-white/60 text-sm">{user.displayName}</span>
          </div>
          <button
            onClick={signOut}
            className="text-white/30 hover:text-white/60 text-sm transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-8 py-12">
        {/* Page title */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-semibold text-white mb-1">
              My Spreadsheets
            </h1>
            <p className="text-white/30 text-sm">
              {documents.length > 0
                ? `${documents.length} document${documents.length !== 1 ? "s" : ""}`
                : "No documents yet"}
            </p>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] hover:opacity-90 text-white font-medium rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-[#00d4ff]/10"
          >
            {creating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10M3 8h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
                New Spreadsheet
              </>
            )}
          </button>
        </div>

        {/* Documents grid */}
        {docsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-48 rounded-2xl bg-white/[0.03] animate-pulse"
              />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-2">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect x="4" y="4" width="11" height="11" rx="2" fill="white" fillOpacity="0.1" />
                <rect x="17" y="4" width="11" height="11" rx="2" fill="white" fillOpacity="0.1" />
                <rect x="4" y="17" width="11" height="11" rx="2" fill="white" fillOpacity="0.1" />
                <rect x="17" y="17" width="11" height="11" rx="2" fill="white" fillOpacity="0.1" />
              </svg>
            </div>
            <p className="text-white/40 text-sm">No spreadsheets yet</p>
            <button
              onClick={handleCreate}
              className="text-[#00d4ff] text-sm hover:underline"
            >
              Create your first one →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* New document card */}
            <button
              onClick={handleCreate}
              disabled={creating}
              className="h-48 border-2 border-dashed border-white/10 rounded-2xl hover:border-white/20 hover:bg-white/[0.02] transition-all flex flex-col items-center justify-center gap-2 text-white/20 hover:text-white/40 group"
            >
              <div className="w-10 h-10 rounded-xl border-2 border-white/10 group-hover:border-white/20 flex items-center justify-center transition-colors">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 4v10M4 9h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <span className="text-xs font-medium">New spreadsheet</span>
            </button>

            {documents.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
