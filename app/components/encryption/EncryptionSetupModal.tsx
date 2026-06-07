"use client";

import { useState, useEffect, useCallback } from "react";
import { useEncryption } from "@/hooks/useEncryption";
import { useNotification } from "@/context/NotificationContext";
import { useDraggableSheet } from "@/app/hooks/useDraggableSheet";

interface EncryptionSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SetupStep = "create" | "recovery" | "confirm";

export default function EncryptionSetupModal({ isOpen, onClose }: EncryptionSetupModalProps) {
  const { setup } = useEncryption();
  const { showNotification } = useNotification();

  const [step, setStep] = useState<SetupStep>("create");
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [confirmKey, setConfirmKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { sheetRef, style, handlers, isClosing } = useDraggableSheet({ isOpen, onClose });
  const [isEntering, setIsEntering] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsEntering(true);
      const timer = setTimeout(() => setIsEntering(false), 600);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setStep("create");
      setPassphrase("");
      setConfirmPassphrase("");
      setRecoveryKey("");
      setConfirmKey("");
      setError("");
    }
  }, [isOpen]);

  // Passphrase strength
  const getStrength = (p: string): { label: string; color: string; pct: number } => {
    if (p.length === 0) return { label: "", color: "", pct: 0 };
    let score = 0;
    if (p.length >= 8) score += 25;
    if (p.length >= 12) score += 15;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score += 20;
    if (/\d/.test(p)) score += 20;
    if (/[^a-zA-Z0-9]/.test(p)) score += 20;
    if (score < 30) return { label: "Weak", color: "bg-red-500", pct: score };
    if (score < 60) return { label: "Fair", color: "bg-amber-500", pct: score };
    if (score < 80) return { label: "Good", color: "bg-blue-500", pct: score };
    return { label: "Strong", color: "bg-emerald-500", pct: score };
  };

  const strength = getStrength(passphrase);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (passphrase.length < 8) {
      setError("Passphrase must be at least 8 characters.");
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setError("Passphrases do not match.");
      return;
    }

    setLoading(true);
    try {
      const key = await setup(passphrase);
      if (key) {
        setRecoveryKey(key);
        setStep("recovery");
      } else {
        setError("Failed to set up encryption. Please try again.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setError("");
    if (confirmKey.trim() !== recoveryKey.trim()) {
      setError("Recovery key does not match. Please copy it exactly.");
      return;
    }
    showNotification("Encryption enabled. Your data is now protected.", "success");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 ${isClosing ? 'pointer-events-none' : ''}`}>
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer transition-opacity duration-300 animate-in fade-in ${isClosing ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        style={style}
        className={`relative bg-[var(--surface)] w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border-t sm:border border-[var(--border)] shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[85vh] flex flex-col transition-all ${isEntering ? 'animate-sheet-in' : ''} sm:animate-in sm:slide-in-from-bottom-0 sm:zoom-in-95 sm:fade-in`}
      >
        <div
          className="w-full pt-4 pb-2 drag-handle-area touch-none cursor-grab active:cursor-grabbing sm:hidden shrink-0"
          {...handlers}
        >
          <div className="w-12 h-1.5 bg-[var(--border)] rounded-full mx-auto pointer-events-none" />
        </div>

        <div className="flex items-center justify-between px-6 pb-4 border-b border-[var(--border)] shrink-0">
          <h2 className="text-xl font-playfair font-bold text-[var(--foreground)]">Enable Encryption</h2>
          <button onClick={onClose} className="p-2 -mr-2 hover:bg-[var(--border)] rounded-full transition-colors text-[var(--muted)] bg-[var(--background)] sm:bg-transparent">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 font-medium">
              {error}
            </div>
          )}

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {(["create", "recovery", "confirm"] as SetupStep[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === s ? "bg-[var(--accent)] text-[var(--background)]" :
                  ["create", "recovery", "confirm"].indexOf(step) > i ? "bg-emerald-500 text-white" : "bg-[var(--border)] text-[var(--muted)]"
                }`}>
                  {["create", "recovery", "confirm"].indexOf(step) > i ? "✓" : i + 1}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider hidden sm:inline ${
                  step === s ? "text-[var(--foreground)]" : "text-[var(--muted)]"
                }`}>
                  {s === "create" ? "Create" : s === "recovery" ? "Recovery Key" : "Confirm"}
                </span>
                {i < 2 && <div className="flex-1 h-px bg-[var(--border)]" />}
              </div>
            ))}
          </div>

          {step === "create" && (
            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <p className="text-sm text-[var(--muted)] mb-4">
                  Choose a strong passphrase to protect your encrypted data. This passphrase will be required to unlock your data each session.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Passphrase</label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full py-2 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none text-[var(--foreground)] font-medium"
                  autoFocus
                />
                {passphrase.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="w-full h-1 bg-[var(--border)] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} style={{ width: `${strength.pct}%` }} />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: strength.color }}>{strength.label}</p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Confirm Passphrase</label>
                <input
                  type="password"
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  placeholder="Re-enter passphrase"
                  className="w-full py-2 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none text-[var(--foreground)] font-medium"
                />
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">
                  ⚠ Important
                </p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  If you lose both your passphrase and recovery key, encrypted data cannot be recovered.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || passphrase.length < 8 || passphrase !== confirmPassphrase}
                className="w-full py-3.5 bg-[var(--accent)] text-[var(--background)] font-bold text-xs uppercase tracking-widest rounded-xl cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Setting up..." : "Generate Keys"}
              </button>
            </form>
          )}

          {step === "recovery" && (
            <div className="space-y-5">
              <div>
                <p className="text-sm text-[var(--muted)] mb-2">
                  This is your recovery key. <strong>Save it somewhere safe.</strong> You can use it to regain access if you forget your passphrase.
                </p>
              </div>

              <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl p-4">
                <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Recovery Key</p>
                <code className="block text-sm font-mono break-all bg-[var(--border)]/50 p-3 rounded-lg select-all text-[var(--foreground)]">
                  {recoveryKey}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(recoveryKey);
                    showNotification("Recovery key copied to clipboard", "success");
                  }}
                  className="mt-2 text-[11px] font-bold text-[var(--accent)] hover:opacity-70 cursor-pointer"
                >
                  Copy to clipboard
                </button>
              </div>

              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">
                <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">
                  ⚠ Critical
                </p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  If you lose both your passphrase and recovery key, encrypted data cannot be recovered. Store this key in a password manager or offline.
                </p>
              </div>

              <button
                onClick={() => setStep("confirm")}
                className="w-full py-3.5 bg-[var(--accent)] text-[var(--background)] font-bold text-xs uppercase tracking-widest rounded-xl cursor-pointer hover:opacity-90"
              >
                I've Saved My Recovery Key
              </button>
            </div>
          )}

          {step === "confirm" && (
            <div className="space-y-5">
              <div>
                <p className="text-sm text-[var(--muted)] mb-2">
                  Confirm your recovery key by pasting or typing it below to verify you have saved it correctly.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Enter Recovery Key</label>
                <textarea
                  value={confirmKey}
                  onChange={(e) => setConfirmKey(e.target.value)}
                  placeholder="Paste or type your recovery key..."
                  rows={3}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-3 text-sm font-mono outline-none focus:border-[var(--accent)] text-[var(--foreground)] resize-none"
                />
              </div>

              <button
                onClick={handleConfirm}
                disabled={confirmKey.trim() !== recoveryKey.trim()}
                className="w-full py-3.5 bg-[var(--accent)] text-[var(--background)] font-bold text-xs uppercase tracking-widest rounded-xl cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm & Enable Encryption
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
