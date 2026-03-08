"use client";

import { useState } from "react";
import type { PresenceUser } from "../../types";

interface PresenceBarProps {
  users: PresenceUser[];
  currentUid: string;
}

export function PresenceBar({ users, currentUid }: PresenceBarProps) {
  const [hoveredUid, setHoveredUid] = useState<string | null>(null);

  const others = users.filter((u) => u.uid !== currentUid);
  const me = users.find((u) => u.uid === currentUid);

  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {/* User avatars */}
      <div className="flex items-center -space-x-1.5">
        {me && (
          <div
            className="relative"
            onMouseEnter={() => setHoveredUid(me.uid)}
            onMouseLeave={() => setHoveredUid(null)}
          >
            <div
              className="w-7 h-7 rounded-full border-2 border-[#0f0f1a] flex items-center justify-center text-[10px] font-bold text-white cursor-default select-none ring-1 ring-white/20"
              style={{ backgroundColor: me.color }}
            >
              {me.displayName.charAt(0).toUpperCase()}
            </div>
            {hoveredUid === me.uid && (
              <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#1a1a2e] text-white text-xs px-2 py-1 rounded-md border border-white/10 shadow-lg z-50">
                {me.displayName} <span className="text-white/40">(you)</span>
              </div>
            )}
          </div>
        )}

        {others.map((user) => (
          <div
            key={user.uid}
            className="relative"
            onMouseEnter={() => setHoveredUid(user.uid)}
            onMouseLeave={() => setHoveredUid(null)}
          >
            <div
              className="w-7 h-7 rounded-full border-2 border-[#0f0f1a] flex items-center justify-center text-[10px] font-bold text-white cursor-default select-none"
              style={{ backgroundColor: user.color }}
            >
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            {/* Active pulse ring */}
            <span
              className="absolute inset-0 rounded-full animate-ping opacity-30"
              style={{ backgroundColor: user.color }}
            />
            {hoveredUid === user.uid && (
              <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#1a1a2e] text-white text-xs px-2 py-1 rounded-md border border-white/10 shadow-lg z-50">
                {user.displayName}
                {user.selectedCell && (
                  <span className="text-white/40 ml-1">@ {user.selectedCell}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {others.length > 0 && (
        <span className="text-white/30 text-xs font-mono">
          {others.length} other{others.length !== 1 ? "s" : ""} editing
        </span>
      )}
    </div>
  );
}
