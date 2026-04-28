"use client";

import { fromSmallestUnit, formatRoomCurrency } from "@/utils/roomCurrency";

interface RoomCardProps {
  room: any;
  onClick: () => void;
  loading?: boolean;
}

function Avatar({ user, size = 24 }: { user: any; size?: number }) {
  if (user?.image) {
    return (
      <img
        src={user.image}
        alt={user.name}
        width={size}
        height={size}
        className="rounded-full object-cover border border-[var(--border)]"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = (user?.name || "?")
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className="rounded-full bg-[var(--border)] flex items-center justify-center text-[var(--muted)] font-bold border border-[var(--border)]"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
}

export default function RoomCard({ room, onClick, loading = false }: RoomCardProps) {
  const net = room.netBalance ?? 0;
  const isOwed = net < 0;   // net < 0 means others owe you
  const isOwing = net > 0;  // net > 0 means you owe others
  const isSettled = net === 0;

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-full text-left bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 hover:border-[var(--accent)]/40 hover:shadow-lg transition-all duration-200 group relative ${loading ? 'processing-ticket cursor-wait' : 'cursor-pointer'}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-playfair font-bold text-[var(--foreground)] truncate group-hover:text-[var(--accent)] transition-colors">
              {room.name}
            </h3>
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-[var(--muted)] bg-[var(--border)] px-2 py-0.5 rounded-full">
              {room.currency}
            </span>
          </div>
          <p className="text-[11px] text-[var(--muted)]">
            {room.users?.length ?? 0} member{(room.users?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Balance indicator */}
        <div className="shrink-0 text-right">
          {isSettled && (
            <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
              Settled
            </span>
          )}
          {isOwing && (
            <div>
              <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">You owe</p>
              <p className="text-sm font-bold text-rose-500">{formatRoomCurrency(net, room.currency)}</p>
            </div>
          )}
          {isOwed && (
            <div>
              <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">You're owed</p>
              <p className="text-sm font-bold text-emerald-500">{formatRoomCurrency(-net, room.currency)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Member avatars */}
      {room.users?.length > 0 && (
        <div className="mt-4 flex items-center gap-1">
          {room.users.slice(0, 5).map((u: any) => (
            <Avatar key={u._id} user={u} size={22} />
          ))}
          {room.users.length > 5 && (
            <span className="text-[10px] font-bold text-[var(--muted)] ml-1">
              +{room.users.length - 5}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

export { Avatar };
