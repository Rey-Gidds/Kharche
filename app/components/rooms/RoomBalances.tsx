"use client";

import { useState, useEffect, useCallback } from "react";
import { formatRoomCurrency } from "@/utils/roomCurrency";
import SettleModal from "./SettleModal";

interface RoomBalancesProps {
  roomId: string;
  currency: string;
}

export default function RoomBalances({ roomId, currency }: RoomBalancesProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [settleTarget, setSettleTarget] = useState<any>(null);
  const [settleAll, setSettleAll] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/rooms/${roomId}/stats`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to load balances"); return; }
      setStats(data);
    } catch {
      setError("Failed to load balances");
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin h-6 w-6 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-sm text-red-500">{error}</div>
    );
  }

  const balances: any[] = stats?.balances ?? [];
  const youOwe = balances.filter((b) => b.amount > 0);
  const owedToYou = balances.filter((b) => b.amount < 0);
  const totalYouOwe = youOwe.reduce((s: number, b: any) => s + b.amount, 0);
  const totalOwedToYou = owedToYou.reduce((s: number, b: any) => s + Math.abs(b.amount), 0);
  const netBalance = totalOwedToYou - totalYouOwe; // positive = owed more

  const getInitials = (name: string) =>
    name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  const UserAvatar = ({ user }: { user: any }) =>
    user?.image ? (
      <img src={user.image} alt={user.name} className="w-9 h-9 rounded-full object-cover border border-[var(--border)]" />
    ) : (
      <div className="w-9 h-9 rounded-full bg-[var(--border)] flex items-center justify-center text-[var(--muted)] font-bold text-xs">
        {getInitials(user?.name || "?")}
      </div>
    );

  return (
    <div className="space-y-8">
      {/* Net Summary */}
      <div className={`rounded-2xl p-5 border ${
        netBalance > 0
          ? "bg-emerald-500/5 border-emerald-500/20"
          : netBalance < 0
          ? "bg-rose-500/5 border-rose-500/20"
          : "bg-[var(--surface)] border-[var(--border)]"
      }`}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mb-1">Net Balance</p>
        {netBalance === 0 && totalYouOwe === 0 && totalOwedToYou === 0 ? (
          <p className="font-playfair font-bold text-2xl text-emerald-500">All settled up ✓</p>
        ) : netBalance > 0 ? (
          <p className="font-playfair font-bold text-2xl text-emerald-500">
            You are owed {formatRoomCurrency(totalOwedToYou, currency)}
          </p>
        ) : netBalance < 0 ? (
          <p className="font-playfair font-bold text-2xl text-rose-500">
            You owe {formatRoomCurrency(totalYouOwe, currency)} total
          </p>
        ) : (
          <p className="font-playfair font-bold text-2xl text-[var(--foreground)]">Balanced</p>
        )}
      </div>

      {/* You Owe */}
      {youOwe.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-widest">You Owe</h3>
            {youOwe.length > 1 && (
              <button
                onClick={() => setSettleAll(true)}
                className="text-[10px] font-bold text-rose-500 hover:text-rose-400 uppercase tracking-widest flex items-center gap-1 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                Settle All
              </button>
            )}
          </div>
          <div className="space-y-2">
            {youOwe.map((b: any) => (
              <div
                key={b.userId}
                className="flex items-center gap-4 p-4 bg-[var(--surface)] border border-rose-500/20 rounded-xl"
              >
                <UserAvatar user={b.user} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[var(--foreground)] truncate">{b.user?.name}</p>
                  <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">You owe</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <p className="font-playfair font-bold text-rose-500">{formatRoomCurrency(b.amount, currency)}</p>
                  <button
                    onClick={() => setSettleTarget(b)}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg cursor-pointer transition-colors"
                  >
                    Settle
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Owed to You */}
      {owedToYou.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-widest">Owed to You</h3>
          <div className="space-y-2">
            {owedToYou.map((b: any) => (
              <div
                key={b.userId}
                className="flex items-center gap-4 p-4 bg-[var(--surface)] border border-emerald-500/20 rounded-xl"
              >
                <UserAvatar user={b.user} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[var(--foreground)] truncate">{b.user?.name}</p>
                  <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Owes you</p>
                </div>
                <p className="font-playfair font-bold text-emerald-500 shrink-0">
                  {formatRoomCurrency(Math.abs(b.amount), currency)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {balances.length === 0 && (
        <div className="text-center py-16 text-sm text-[var(--muted)] italic">
          No balances yet. Add an expense to get started.
        </div>
      )}

      {/* Settle single person modal */}
      {settleTarget && (
        <SettleModal
          isOpen={!!settleTarget}
          onClose={() => setSettleTarget(null)}
          onSuccess={fetchStats}
          roomId={roomId}
          currency={currency}
          receiverUser={{ _id: settleTarget.userId, name: settleTarget.user?.name }}
          currentBalance={settleTarget.amount}
        />
      )}

      {/* Settle All modal — opens settle for the first person, user repeats for others */}
      {settleAll && youOwe.length > 0 && (
        <SettleModal
          isOpen={settleAll}
          onClose={() => setSettleAll(false)}
          onSuccess={() => { setSettleAll(false); fetchStats(); }}
          roomId={roomId}
          currency={currency}
          receiverUser={{ _id: youOwe[0].userId, name: youOwe[0].user?.name }}
          currentBalance={totalYouOwe}
        />
      )}
    </div>
  );
}
