"use client";

import { useState, type FormEvent } from "react";
import { useAuthContext } from "./AuthProvider";

export function SignInModal() {
  const { signInWithGoogle, updateDisplayName } = useAuthContext();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"choose" | "name">("choose");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      await updateDisplayName(trimmed);
    } catch {
      setError("Failed to set display name.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0f]">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-md mx-4">
        {/* Glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-[#00d4ff20] to-[#7c3aed20] rounded-2xl blur-xl" />

        <div className="relative bg-[#0f0f1a] border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Logo mark */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00d4ff] to-[#7c3aed] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="1" y="1" width="7" height="7" rx="1" fill="white" fillOpacity="0.9" />
                <rect x="10" y="1" width="7" height="7" rx="1" fill="white" fillOpacity="0.5" />
                <rect x="1" y="10" width="7" height="7" rx="1" fill="white" fillOpacity="0.5" />
                <rect x="10" y="10" width="7" height="7" rx="1" fill="white" fillOpacity="0.9" />
              </svg>
            </div>
            <span
              className="text-xl font-semibold text-white tracking-tight"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              sheets
            </span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-white/40 text-sm mb-8">
            Real-time collaborative spreadsheets
          </p>

          {mode === "choose" && (
            <div className="space-y-3">
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-white/90 text-[#0a0a0f] font-medium rounded-xl transition-all duration-150 disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path
                    fill="#4285F4"
                    d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                  />
                  <path
                    fill="#34A853"
                    d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                  />
                  <path
                    fill="#EA4335"
                    d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                  />
                </svg>
                Continue with Google
              </button>

              <div className="relative flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-white/30 text-xs">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <button
                onClick={() => setMode("name")}
                className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-medium rounded-xl transition-all duration-150 border border-white/10"
              >
                Continue as guest
              </button>
            </div>
          )}

          {mode === "name" && (
            <form onSubmit={handleGuestSubmit} className="space-y-4">
              <div>
                <label className="block text-white/50 text-xs mb-2 uppercase tracking-wider">
                  Your display name
                </label>
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Chen"
                  maxLength={32}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#00d4ff]/50 focus:ring-1 focus:ring-[#00d4ff]/20 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="w-full px-4 py-3 bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] hover:opacity-90 text-white font-semibold rounded-xl transition-all duration-150 disabled:opacity-40"
              >
                {loading ? "Setting up..." : "Enter workspace"}
              </button>

              <button
                type="button"
                onClick={() => setMode("choose")}
                className="w-full text-white/30 hover:text-white/60 text-sm transition-colors"
              >
                ← Back
              </button>
            </form>
          )}

          {error && (
            <p className="mt-4 text-red-400/80 text-sm text-center">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
