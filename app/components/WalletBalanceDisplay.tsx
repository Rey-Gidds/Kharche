"use client";

import { useWallet } from "@/context/WalletContext";
import { useSession } from "@/lib/auth-client";

interface WalletBalanceDisplayProps {
  initialBalance?: number;
  currency?: string;
}

export default function WalletBalanceDisplay({ initialBalance, currency }: WalletBalanceDisplayProps) {
  const { walletBalance, walletCurrency, loading } = useWallet();
  const { isPending } = useSession();

  // Use the context balance if we have one, otherwise fallback to the initialBalance from SSR
  const displayBalance = (walletBalance === 0 && initialBalance !== undefined && !isPending) 
    ? initialBalance 
    : walletBalance;

  const displayCurrency = walletCurrency || currency || "INR";

  return (
    <div className="flex flex-col items-end border-r border-[var(--border)] pr-6">
      <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest leading-loose">Wallet Balance</p>
      <div className="flex items-baseline gap-1">
        <span className={`text-lg font-serif font-bold transition-all duration-500 ${loading && walletBalance === 0 ? 'opacity-50 animate-pulse' : 'text-emerald-500'}`}>
          {displayBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
        <span className="text-[10px] font-bold text-[var(--muted)]">{displayCurrency}</span>
      </div>
    </div>
  );
}
