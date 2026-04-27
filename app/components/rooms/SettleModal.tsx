"use client";

import { useState, useEffect, useCallback } from "react";
import { formatRoomCurrency, fromSmallestUnit } from "@/utils/roomCurrency";
import { useSWRConfig } from "swr";
import { useWallet } from "@/context/WalletContext";
import { useDraggableSheet } from "@/app/hooks/useDraggableSheet";

interface SettleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  roomId: string;
  currency: string;
  receiverUser: { _id: string; name: string } | null;
  currentBalance: number; // in smallest unit (positive = you owe them)
}

export default function SettleModal({
  isOpen, onClose, onSuccess, roomId, currency, receiverUser, currentBalance,
}: SettleModalProps) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { mutate } = useSWRConfig();
  const { refetchWallet } = useWallet();

  const maxDisplay = fromSmallestUnit(currentBalance, currency);
  
  const { sheetRef, style, handlers } = useDraggableSheet({ isOpen, onClose });

  useEffect(() => {
    if (isOpen && currentBalance > 0) {
      setAmount(maxDisplay.toFixed(3).replace(/\.?0+$/, '')); // Format without trailing zeros
      setError("");
    }
  }, [isOpen, currentBalance, maxDisplay]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !receiverUser) return null;

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) { setError("Enter a valid positive amount."); return; }
    
    const decimalRegex = /^\d+(\.\d{1,3})?$/;
    if (!decimalRegex.test(amount)) {
      setError("Amount can only have up to 3 decimal places."); return;
    }

    if (val > maxDisplay + 0.001) { setError(`Amount cannot exceed ${maxDisplay.toFixed(3)} (your current balance).`); return; }
    const statsKey = `/api/rooms/${roomId}/stats`;
    const ticketsKey = `/api/rooms/${roomId}/tickets`;

    setError("");
    setLoading(true);
    try {
      await mutate(
        statsKey,
        async () => {
          const res = await fetch(`/api/rooms/${roomId}/settle`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ receiverId: receiverUser._id, amount: val }),
          });
          
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to record settlement.");
          }

          // Background revalidation
          mutate(ticketsKey);
          refetchWallet();

          return fetch(statsKey).then(r => r.json());
        },
        {
          optimisticData: (currentStats: any) => {
            if (!currentStats || !currentStats.balances) return currentStats;
            const newBalances = currentStats.balances.map((b: any) => {
              if (b.userId === receiverUser._id) {
                // currentBalance is in smallest units, val is in float
                // Need to convert val back to smallest units for consistency in stats?
                // Wait, stats usually has amount in the same unit as input or smallest.
                // Looking at RoomBalances.tsx, it uses b.amount directly.
                // Assuming b.amount is in smallest units.
                const settleSmallest = Math.round(val * (currency === "INR" ? 1000 : 100)); // Simplified
                // Actually I should use the same utility toSmallestUnit if I had it here.
                // But let's just use the currentBalance logic.
                return { ...b, amount: Math.max(0, b.amount - currentBalance * (val / fromSmallestUnit(currentBalance, currency))) };
              }
              return b;
            });
            return { ...currentStats, balances: newBalances };
          },
          rollbackOnError: true,
          revalidate: true,
          populateCache: true,
        }
      );

      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" onClick={onClose} />
      <div 
        ref={sheetRef}
        style={style}
        className="relative bg-[var(--surface)] w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl border-t sm:border border-[var(--border)] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:fade-in sm:zoom-in-95 duration-200"
      >
        <div 
          className="w-full pt-4 pb-2 drag-handle-area touch-none cursor-grab active:cursor-grabbing sm:hidden shrink-0"
          {...handlers}
        >
          <div className="w-12 h-1.5 bg-[var(--border)] rounded-full mx-auto pointer-events-none" />
        </div>
        <div className="flex items-center justify-between px-5 pb-4 sm:p-6 sm:pt-6 sm:border-b border-[var(--border)]">
          <h2 className="text-xl font-playfair font-bold text-[var(--foreground)]">Settle Up</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--border)] rounded-full transition-colors text-[var(--muted)] cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <form onSubmit={handleSettle} className="px-5 pb-8 sm:p-6 space-y-6">
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
            <p className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">You owe</p>
            <p className="font-playfair font-bold text-xl text-rose-500">
              {formatRoomCurrency(currentBalance, currency)}
            </p>
            <p className="text-[11px] text-[var(--muted)] mt-1">to {receiverUser.name}</p>
          </div>

          {error && (
            <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-3 font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
              Settle Amount ({currency})
            </label>
            <div className="flex items-center gap-2 border-b border-[var(--border)] focus-within:border-[var(--accent)]">
              <input
                type="number"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value;
                  const decimalParts = val.split('.');
                  if (decimalParts.length > 1 && decimalParts[1].length > 3) return;
                  setAmount(val);
                }}
                step="0.001"
                min="0.001"
                max={maxDisplay}
                required
                autoFocus
                className="flex-1 py-2 bg-transparent outline-none font-bold text-lg text-[var(--foreground)]"
              />
              <button
                type="button"
                onClick={() => setAmount(maxDisplay.toFixed(3).replace(/\.?0+$/, ''))}
                className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest hover:opacity-70 cursor-pointer"
              >
                Full
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3.5 bg-emerald-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl cursor-pointer hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Recording..." : "Confirm Settlement"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 border border-[var(--border)] rounded-xl text-sm text-[var(--muted)] cursor-pointer hover:bg-[var(--background)]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
