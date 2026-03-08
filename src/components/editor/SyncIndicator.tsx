"use client";

import { useEffect, useState } from "react";
import { useSpreadsheetStore } from "../../store/spreadsheetStore";
import type { SyncStatus } from "../../types";

const STATUS_CONFIG: Record<
  SyncStatus,
  { label: string; dotClass: string; textClass: string }
> = {
  idle: {
    label: "All changes saved",
    dotClass: "bg-emerald-400",
    textClass: "text-white/30",
  },
  saving: {
    label: "Saving...",
    dotClass: "bg-amber-400 animate-pulse",
    textClass: "text-amber-400/70",
  },
  saved: {
    label: "Saved",
    dotClass: "bg-emerald-400",
    textClass: "text-emerald-400/70",
  },
  error: {
    label: "Save failed",
    dotClass: "bg-red-400",
    textClass: "text-red-400/70",
  },
};

export function SyncIndicator() {
  const syncStatus = useSpreadsheetStore((s) => s.syncStatus);
  const [shown, setShown] = useState<SyncStatus>(syncStatus);

  useEffect(() => {
    setShown(syncStatus);
    // Auto-transition "saved" back to "idle" after 2s
    if (syncStatus === "saved") {
      const t = setTimeout(() => {
        useSpreadsheetStore.getState().setSyncStatus("idle");
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [syncStatus]);

  const config = STATUS_CONFIG[shown];

  return (
    <div className="flex items-center gap-1.5 select-none">
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
      <span className={`text-xs font-mono ${config.textClass}`}>
        {config.label}
      </span>
    </div>
  );
}
