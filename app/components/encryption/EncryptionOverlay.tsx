"use client";

import { useState, useEffect, useCallback } from "react";
import { useEncryption } from "@/hooks/useEncryption";
import EncryptionUnlockModal from "./EncryptionUnlockModal";
import EncryptionSetupModal from "./EncryptionSetupModal";
import { runBackfill } from "@/lib/backfill/backfillProcessor";
import { getMasterKey } from "@/crypto/indexeddb/cacheManager";
import type { BackfillProgress } from "@/lib/backfill/types";

export default function EncryptionOverlay() {
  const { status, isLoading, setupCompleted, needsBackfill, isUnlocked, isAutoUnlocking, refreshStatus } = useEncryption();
  const [showUnlock, setShowUnlock] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState<BackfillProgress | null>(null);
  const [backfillError, setBackfillError] = useState<string | null>(null);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Once status is loaded, decide what to show
  useEffect(() => {
    if (isLoading || isAutoUnlocking || initialized) return;

    if (!setupCompleted) {
      setShowSetup(true);
    } else if (setupCompleted && !isUnlocked) {
      setShowUnlock(true);
    }

    setInitialized(true);
  }, [isLoading, isAutoUnlocking, setupCompleted, isUnlocked, initialized]);

  const handleUnlocked = () => {
    setShowUnlock(false);
  };

  const handleSetupClose = () => {
    setShowSetup(false);
    refreshStatus();
  };

  // Start backfill when user is unlocked and needsBackfill is true
  useEffect(() => {
    if (!isUnlocked || !needsBackfill || isBackfilling) return;
    startBackfill();
  }, [isUnlocked, needsBackfill]);

  const startBackfill = useCallback(async () => {
    const masterKey = getMasterKey();
    if (!masterKey) return;

    setIsBackfilling(true);
    setBackfillError(null);

    try {
      await runBackfill({
        masterKey,
        onProgress: (progress) => {
          setBackfillProgress(progress);
          if (progress.phase === "complete") {
            refreshStatus();
          }
        },
      });
    } catch (err: any) {
      setBackfillError(err.message || "Backfill failed");
    } finally {
      setIsBackfilling(false);
    }
  }, [refreshStatus]);

  const handleRetry = () => {
    startBackfill();
  };

  if (isLoading) return null;

  // Auto-unlocking overlay
  if (isAutoUnlocking && setupCompleted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--background)]/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-[var(--muted)]">Unlocking...</span>
        </div>
      </div>
    );
  }

  // Backfill overlay
  if (backfillProgress && backfillProgress.phase !== "complete") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--background)]/80 backdrop-blur-sm">
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-2xl p-8 max-w-sm w-full mx-4 space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Encrypting Your Data</h2>
            <p className="text-sm text-[var(--muted)] mt-1">
              {backfillProgress.phase === "expenses" && "Encrypting expenses..."}
              {backfillProgress.phase === "books" && "Encrypting expense books..."}
              {backfillProgress.phase === "rooms" && "Encrypting room data..."}
              {backfillProgress.phase === "room_tickets" && "Encrypting room tickets..."}
            </p>
          </div>

          <div className="w-full bg-[var(--border)] rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
              style={{
                width: backfillProgress.total > 0
                  ? `${Math.round((backfillProgress.completed / backfillProgress.total) * 100)}%`
                  : "50%",
              }}
            />
          </div>

          <p className="text-xs text-[var(--muted)] text-center">
            {backfillProgress.completed > 0
              ? `Processed ${backfillProgress.completed} items`
              : "Processing..."}
          </p>

          {backfillError && (
            <div className="space-y-3">
              <p className="text-xs text-rose-500 text-center">{backfillError}</p>
              <button
                onClick={handleRetry}
                className="w-full py-3 bg-[var(--accent)] text-[var(--background)] font-bold text-xs uppercase tracking-widest rounded-xl cursor-pointer hover:opacity-90"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <EncryptionUnlockModal
        isOpen={showUnlock}
        onUnlocked={handleUnlocked}
        onLocked={handleUnlocked}
      />

      <EncryptionSetupModal
        isOpen={showSetup}
        onClose={handleSetupClose}
      />
    </>
  );
}
