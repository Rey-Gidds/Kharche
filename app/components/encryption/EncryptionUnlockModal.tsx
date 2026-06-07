"use client";

import { useState, useEffect, useRef } from "react";
import { useEncryption } from "@/hooks/useEncryption";

interface EncryptionUnlockModalProps {
  isOpen: boolean;
  onUnlocked: () => void;
  onLocked: () => void;
}

type UnlockStep = "passphrase" | "recovery" | "reveal" | "unavailable";

export default function EncryptionUnlockModal({ isOpen, onUnlocked, onLocked }: EncryptionUnlockModalProps) {
  const { unlock, recoverWithKey, error: encError } = useEncryption();
  const [step, setStep] = useState<UnlockStep>("passphrase");
  const [passphrase, setPassphrase] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [recoveredPassphrase, setRecoveredPassphrase] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const passphraseInputRef = useRef<HTMLInputElement>(null);
  const recoveryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (step === "passphrase" && passphraseInputRef.current) {
        passphraseInputRef.current.focus();
      } else if (step === "recovery" && recoveryInputRef.current) {
        recoveryInputRef.current.focus();
      }
    }
  }, [isOpen, step]);

  useEffect(() => {
    if (!isOpen) {
      setPassphrase("");
      setRecoveryKey("");
      setRecoveredPassphrase("");
      setError("");
      setStep("passphrase");
      setCopied(false);
    }
  }, [isOpen]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const ok = await unlock(passphrase);
      if (ok) {
        setPassphrase("");
        onUnlocked();
      } else {
        setError(encError || "Incorrect passphrase. Please try again.");
      }
    } catch {
      setError("Failed to unlock. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await recoverWithKey(recoveryKey.trim());
      if (res && res.passphrase) {
        setRecoveredPassphrase(res.passphrase);
        setStep("reveal");
      } else {
        // Check if no encrypted passphrase was found on the server
        if (encError && encError.includes("No encrypted passphrase found")) {
          setStep("unavailable");
        } else {
          setError(encError || "Failed to recover passphrase. Ensure your recovery key is correct.");
        }
      }
    } catch (err: any) {
      setError(err?.message || "Recovery failed. Please check your recovery key.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(recoveredPassphrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative bg-[var(--surface)] w-full max-w-sm rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
        <div className="p-8 space-y-6">
          
          {step === "passphrase" && (
            <>
              {/* Lock icon */}
              <div className="w-12 h-12 rounded-full bg-[var(--border)] flex items-center justify-center mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--muted)]">
                  <rect x="3" y="11" width="18" height="10" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>

              <div className="text-center">
                <h2 className="text-lg font-playfair font-bold text-[var(--foreground)]">Unlock Encryption</h2>
                <p className="text-sm text-[var(--muted)] mt-1">Enter your passphrase to access encrypted data.</p>
              </div>

              {error && (
                <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 font-medium text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleUnlock} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Passphrase</label>
                  <input
                    ref={passphraseInputRef}
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Enter your passphrase"
                    className="w-full py-2.5 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none text-[var(--foreground)] font-medium"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !passphrase}
                  className="w-full py-3 bg-[var(--accent)] text-[var(--background)] font-bold text-xs uppercase tracking-widest rounded-xl cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Unlocking..." : "Unlock"}
                </button>

                <div className="flex flex-col gap-2 pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => { setError(""); setStep("recovery"); }}
                    className="text-[11px] font-bold text-[var(--accent)] hover:opacity-80 cursor-pointer"
                  >
                    Forgot passphrase?
                  </button>
                </div>
              </form>
            </>
          )}

          {step === "recovery" && (
            <>
              {/* Shield/Key icon */}
              <div className="w-12 h-12 rounded-full bg-[var(--border)] flex items-center justify-center mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--muted)]">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                </svg>
              </div>

              <div className="text-center">
                <h2 className="text-lg font-playfair font-bold text-[var(--foreground)]">Recover Passphrase</h2>
                <p className="text-sm text-[var(--muted)] mt-1">Enter your recovery key to retrieve your passphrase and unlock your data.</p>
              </div>

              {error && (
                <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 font-medium text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleRecovery} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Recovery Key</label>
                  <input
                    ref={recoveryInputRef}
                    type="text"
                    value={recoveryKey}
                    onChange={(e) => setRecoveryKey(e.target.value)}
                    placeholder="Enter your recovery key"
                    className="w-full py-2.5 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none text-[var(--foreground)] font-medium"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !recoveryKey}
                  className="w-full py-3 bg-[var(--accent)] text-[var(--background)] font-bold text-xs uppercase tracking-widest rounded-xl cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Recovering..." : "Recover & Unlock"}
                </button>

                <button
                  type="button"
                  onClick={() => { setError(""); setStep("passphrase"); }}
                  className="w-full py-2 text-[11px] font-bold text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
                >
                  ← Back to passphrase login
                </button>
              </form>
            </>
          )}

          {step === "reveal" && (
            <>
              {/* Success Check icon */}
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <div className="text-center space-y-2">
                <h2 className="text-lg font-playfair font-bold text-[var(--foreground)]">Passphrase Recovered</h2>
                <p className="text-sm text-[var(--muted)]">Your original passphrase has been recovered. Please save it securely.</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-[var(--border)] rounded-xl border border-[var(--border)] flex flex-col items-center gap-3">
                  <span className="font-mono text-base font-bold text-[var(--foreground)] break-all select-all text-center">
                    {recoveredPassphrase}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-4 py-1.5 bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--border)] text-xs font-bold uppercase tracking-wider rounded-lg text-[var(--foreground)] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Copied!
                      </>
                    ) : "Copy to Clipboard"}
                  </button>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] leading-relaxed rounded-xl text-center">
                  ⚠️ This is the only time your passphrase will be revealed. Write it down or store it in a password manager.
                </div>

                <button
                  type="button"
                  onClick={onUnlocked}
                  className="w-full py-3 bg-[var(--accent)] text-[var(--background)] font-bold text-xs uppercase tracking-widest rounded-xl cursor-pointer hover:opacity-90"
                >
                  Continue to Dashboard
                </button>
              </div>
            </>
          )}

          {step === "unavailable" && (
            <>
              {/* Alert Triangle icon */}
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto text-amber-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>

              <div className="text-center">
                <h2 className="text-lg font-playfair font-bold text-[var(--foreground)]">Recovery Unavailable</h2>
                <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">
                  Your encryption setup was created before passphrase recovery was supported.
                </p>
              </div>

              <div className="space-y-4">
                <div className="text-xs text-[var(--muted)] bg-[var(--border)] p-4 rounded-xl space-y-2 leading-relaxed">
                  <p className="font-bold text-[var(--foreground)]">To enable recovery for your account:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Go to Account Settings</li>
                    <li>Disable encryption (new data will save in plaintext)</li>
                    <li>Re-enable encryption to create a new recovery key</li>
                  </ol>
                </div>

                <button
                  type="button"
                  onClick={() => setStep("passphrase")}
                  className="w-full py-3 bg-[var(--accent)] text-[var(--background)] font-bold text-xs uppercase tracking-widest rounded-xl cursor-pointer hover:opacity-90"
                >
                  Go Back
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
