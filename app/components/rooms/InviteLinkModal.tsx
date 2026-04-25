"use client";

import { useEffect, useState } from "react";

interface InviteLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
}

export default function InviteLinkModal({ isOpen, onClose, roomId, roomName }: InviteLinkModalProps) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/rooms/join/${roomId}`
    : "";

  useEffect(() => {
    if (!isOpen) { setCopied(false); }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement("input");
      el.value = inviteUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--surface)] w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border-t sm:border border-[var(--border)] shadow-2xl overflow-hidden">
        <div className="w-12 h-1.5 bg-[var(--border)] rounded-full mx-auto mt-4 mb-2 sm:hidden" />
        <div className="flex items-center justify-between px-5 pb-4 sm:p-6 sm:border-b border-[var(--border)]">
          <h2 className="text-xl font-playfair font-bold text-[var(--foreground)]">Invite to Room</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--border)] rounded-full transition-colors text-[var(--muted)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <div className="px-5 pb-8 sm:p-6 space-y-5">
          <div>
            <p className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Room</p>
            <p className="font-playfair font-bold text-[var(--foreground)] text-lg">{roomName}</p>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Invite Link</p>
            <div className="flex items-center gap-2 bg-[var(--background)] border border-[var(--border)] rounded-xl p-3">
              <p className="flex-1 text-xs text-[var(--muted)] font-mono truncate">{inviteUrl}</p>
              <button
                onClick={handleCopy}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                  copied
                    ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                    : "bg-[var(--accent)] text-[var(--background)] hover:opacity-90"
                }`}
              >
                {copied ? (
                  <span className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
                    Copied
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    Copy
                  </span>
                )}
              </button>
            </div>
            <p className="text-[10px] text-[var(--muted)]">
              Anyone with this link can join the room after signing in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
