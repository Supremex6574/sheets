"use client";

import Link from "next/link";
import type { DocumentMeta } from "../../types";

interface DocumentCardProps {
  doc: DocumentMeta;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "Just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function DocumentCard({ doc }: DocumentCardProps) {
  return (
    <Link
      href={`/doc/${doc.id}`}
      className="group relative block bg-[#0f0f1a] border border-white/[0.07] rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-200 hover:shadow-lg hover:shadow-[#00d4ff08]"
    >
      {/* Preview area */}
      <div className="h-32 bg-gradient-to-br from-white/[0.02] to-transparent relative overflow-hidden">
        {/* Mini grid preview */}
        <div className="absolute inset-4 opacity-30">
          {Array.from({ length: 4 }, (_, r) => (
            <div key={r} className="flex gap-1 mb-1">
              {Array.from({ length: 5 }, (_, c) => (
                <div
                  key={c}
                  className="h-4 rounded-sm bg-white/20"
                  style={{
                    width: c === 0 ? 16 : [40, 60, 48, 52, 44][c % 5],
                    opacity: Math.random() > 0.3 ? 1 : 0.2,
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-[#00d4ff]/20 text-[#00d4ff] text-[10px] font-mono px-2 py-1 rounded-md border border-[#00d4ff]/20">
            Open →
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 border-t border-white/[0.06]">
        <h3 className="text-white font-medium text-sm truncate mb-1 group-hover:text-white transition-colors">
          {doc.title}
        </h3>
        <div className="flex items-center justify-between">
          <p className="text-white/30 text-xs truncate max-w-[60%]">
            {doc.ownerName}
          </p>
          <p className="text-white/20 text-[10px] font-mono">
            {timeAgo(doc.updatedAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}
