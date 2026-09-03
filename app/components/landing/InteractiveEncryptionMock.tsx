"use client";

import { useState } from "react";

export default function InteractiveEncryptionMock() {
  const [isEncrypted, setIsEncrypted] = useState(true);

  const plaintextData = {
    title: "Kyoto Machiya Villa Rent",
    amount: "¥180,000",
    category: "Rent",
    note: "Split between 4 travelers. Deposit paid via wire.",
    date: "2026-09-02",
  };

  const encryptedData = {
    iv: "4f7a9b1c2d3e",
    tag: "9e8a7b6c5d4e3f2a",
    ciphertext:
      "U2FsdGVkX1+vMm3K9xL...72f8b1c4a0e7f8d6a9b4c2e1f0a8d7e6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1",
    algorithm: "AES-256-GCM",
    keyDerivation: "PBKDF2-SHA256 (100,000 iter)",
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3.5 sm:p-6 shadow-sm space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3 sm:pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-playfair font-bold text-base sm:text-lg text-[var(--foreground)]">
              Client-Side Privacy & Encryption
            </h3>
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Zero-Knowledge
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-[var(--muted)] mt-0.5">
            Your expense details and notes are encrypted on your device before saving.
          </p>
        </div>

        {/* Cryptographic Toggle */}
        <div className="flex items-center gap-1.5 bg-[var(--background)] border border-[var(--border)] p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setIsEncrypted(false)}
            className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg transition-all cursor-pointer ${
              !isEncrypted
                ? "bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Decrypted (Client)
          </button>
          <button
            onClick={() => setIsEncrypted(true)}
            className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              isEncrypted
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            Database Stored (Server)
          </button>
        </div>
      </div>

      {/* Simplified Comparison Block */}
      <div className="rounded-xl bg-[var(--background)] border border-[var(--border)] p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 text-xs text-[var(--muted)]">
          <span className="font-semibold text-[var(--foreground)]">
            {isEncrypted ? "Database View (Cloud Storage)" : "Decrypted View (Your Device Only)"}
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-500">
            {isEncrypted ? "Ciphertext Opaque" : "Readable in Memory"}
          </span>
        </div>

        {isEncrypted ? (
          <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)] space-y-2">
            <p className="text-xs text-[var(--muted)]">
              To the cloud database and network eavesdroppers, your transaction looks like random scrambled bytes:
            </p>
            <div className="p-3 rounded bg-[var(--background)] border border-[var(--border)] font-mono text-[11px] text-emerald-500 break-all leading-relaxed">
              7b226976223a22346637613962222c22636970686572223a22553246736447566b58312b764d6d334b39784c3732663862316334613065376638...7d
            </div>
            <p className="text-[11px] text-[var(--muted)]">
              Zero passwords, amounts, or merchant names are visible without your master key.
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--muted)]">Title</p>
                <p className="font-medium text-sm text-[var(--foreground)]">{plaintextData.title}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--muted)]">Amount</p>
                <p className="font-playfair font-bold text-base text-[var(--foreground)]">{plaintextData.amount}</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-xs text-[var(--muted)]">
              <span>Category: <strong className="text-[var(--foreground)]">{plaintextData.category}</strong></span>
              <span>Note: <strong className="text-[var(--foreground)]">{plaintextData.note}</strong></span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
        <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--background)] space-y-1">
          <p className="font-semibold text-[var(--foreground)]">Private Key Derivation</p>
          <p className="text-[var(--muted)] text-[11px] leading-relaxed">
            Your key never leaves your local device. It is generated from your passphrase and kept solely in local memory.
          </p>
        </div>
        <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--background)] space-y-1">
          <p className="font-semibold text-[var(--foreground)]">Zero Server Knowledge</p>
          <p className="text-[var(--muted)] text-[11px] leading-relaxed">
            No database admin or external party can read your ledger, transactions, or account balances.
          </p>
        </div>
        <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--background)] space-y-1">
          <p className="font-semibold text-[var(--foreground)]">Fast Device Sync</p>
          <p className="text-[var(--muted)] text-[11px] leading-relaxed">
            Securely unlock and sync your encrypted ledgers on new phones or laptops with your passphrase.
          </p>
        </div>
      </div>
    </div>
  );
}
