"use client";

import { useState } from "react";
import { formatRoomCurrency } from "@/utils/roomCurrency";
import { useProcessing } from "@/context/ProcessingContext";

interface RoomMembersProps {
  room: any;
  currentUserId: string;
  onLeave: () => void;
}

function Avatar({ user, size = 36 }: { user: any; size?: number }) {
  const initials = (user?.name || "?")
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (user?.image) {
    return (
      <img
        src={user.image}
        alt={user.name}
        className="rounded-full object-cover border border-[var(--border)]"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-[var(--border)] flex items-center justify-center text-[var(--muted)] font-bold border border-[var(--border)]"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

export default function RoomMembers({ room, currentUserId, onLeave }: RoomMembersProps) {
  const { processingIds, setProcessing } = useProcessing();
  const leaving = !!processingIds[`leave-${room._id}`];
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const handleLeave = async () => {
    if (!confirmed) { setConfirmed(true); return; }
    setError("");
    setProcessing(`leave-${room._id}`, true);
    try {
      const res = await fetch(`/api/rooms/${room._id}/leave`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to leave room."); return; }
      onLeave();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setProcessing(`leave-${room._id}`, false);
      setConfirmed(false);
    }
  };

  return (
    <div className={`space-y-6 ${leaving ? 'processing-ticket' : ''}`}>
      <div className="space-y-2">
        {room.users?.map((user: any) => {
          const isYou = user._id === currentUserId;
          return (
            <div
              key={user._id}
              className="flex items-center gap-4 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl"
            >
              <Avatar user={user} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-[var(--foreground)] truncate">{user.name}</p>
                  {isYou && (
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--accent)] bg-[var(--border)] px-2 py-0.5 rounded-full">
                      You
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--muted)]">{user.email}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Leave room */}
      <div className="pt-4 border-t border-[var(--border)]">
        {error && (
          <div className="mb-4 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-3 font-medium">
            {error}
          </div>
        )}
        {confirmed ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--muted)]">
              Are you sure you want to leave <strong className="text-[var(--foreground)]">{room.name}</strong>?
              You must have all balances settled before leaving.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleLeave}
                disabled={leaving}
                className="px-5 py-2.5 bg-red-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl cursor-pointer hover:bg-red-600 disabled:opacity-50"
              >
                {leaving ? "Leaving..." : "Yes, Leave Room"}
              </button>
              <button
                onClick={() => setConfirmed(false)}
                className="px-5 py-2.5 border border-[var(--border)] text-[var(--muted)] text-xs font-bold uppercase tracking-widest rounded-xl cursor-pointer hover:bg-[var(--background)]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleLeave}
            className="flex items-center gap-2 text-xs font-bold text-red-500 hover:text-red-400 cursor-pointer uppercase tracking-widest"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            Leave Room
          </button>
        )}
      </div>
    </div>
  );
}
