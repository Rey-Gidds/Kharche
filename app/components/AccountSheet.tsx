"use client";

import { useState } from "react";
import BottomSheet from "./BottomSheet";
import { useWallet } from "@/context/WalletContext";
import SignOutButton from "./SignOutButton";
import Link from "next/link";

interface AccountSheetProps {
  session: any;
}

export default function AccountSheet({ session }: AccountSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { walletBalance, walletCurrency } = useWallet();

  const initial = session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "U";
  const name = session?.user?.name ?? "";
  const email = session?.user?.email ?? "";

  // Display balance – prefer live context value, fall back to SSR
  const displayBalance = walletBalance || (session?.user as any)?.walletBalance || 0;
  const displayCurrency = walletCurrency || (session?.user as any)?.currency || "INR";

  return (
    <>
      {/* Avatar trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-9 h-9 rounded-full bg-[var(--accent)] text-[var(--background)] flex items-center justify-center font-bold text-sm shadow-md active:scale-95 transition-transform"
        aria-label="Open account"
      >
        {session?.user?.image ? (
          <img src={session.user.image} alt={name} className="w-full h-full rounded-full object-cover" />
        ) : (
          initial
        )}
      </button>

      <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="pb-2">
          {/* Profile hero */}
          <div className="flex flex-col items-center gap-3 pb-6">
            <div className="w-20 h-20 rounded-full bg-[var(--accent)] text-[var(--background)] flex items-center justify-center font-bold text-3xl shadow-lg ring-4 ring-[var(--border)]">
              {session?.user?.image ? (
                <img src={session.user.image} alt={name} className="w-full h-full rounded-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <div className="text-center">
              <p className="text-lg font-playfair font-bold text-[var(--foreground)]">{name}</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">{email}</p>
            </div>
          </div>

          {/* Balance card */}
          <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between mb-6">
            <div>
              <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Wallet Balance</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-playfair font-bold text-emerald-500">
                  {displayBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-bold text-[var(--muted)]">{displayCurrency}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
                <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
              </svg>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <Link
              href="/me?tab=account"
              onClick={() => setIsOpen(false)}
              className="w-full py-3.5 text-center bg-[var(--surface)] border border-[var(--border)] rounded-2xl font-bold text-sm text-[var(--foreground)] hover:border-[var(--accent)] transition-colors"
            >
              Manage Account
            </Link>
            <div className="w-full flex justify-center">
              <SignOutButton />
            </div>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
