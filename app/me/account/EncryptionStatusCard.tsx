"use client";

import { useState } from "react";
import { useEncryption } from "@/hooks/useEncryption";

export default function EncryptionStatusCard() {
  const { isLoading, setupCompleted, isUnlocked } = useEncryption();
  const [showChangePassphrase, setShowChangePassphrase] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-between p-3 bg-[var(--background)] rounded-xl border border-[var(--border)] animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--border)]" />
          <div className="space-y-1.5">
            <div className="h-3 w-20 bg-[var(--border)] rounded" />
            <div className="h-2 w-32 bg-[var(--border)] rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between p-3 md:p-4 bg-[var(--background)] rounded-xl border border-[var(--border)]">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isUnlocked ? "bg-emerald-500/10" : "bg-amber-500/10"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={isUnlocked ? "text-emerald-500" : "text-amber-500"}
            >
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--foreground)] truncate">
              {isUnlocked ? "Encryption active" : "Encryption locked"}
            </p>
            <p className="text-[10px] md:text-xs text-[var(--muted)] truncate">
              {isUnlocked ? "Keys cached in memory" : "Unlock with your passphrase"}
            </p>
          </div>
        </div>

        {isUnlocked && (
          <div className="shrink-0">
            <span className="px-2.5 py-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-500 rounded-full uppercase tracking-wider">
              Active
            </span>
          </div>
        )}
      </div>
    </>
  );
}
