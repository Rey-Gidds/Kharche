"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function Avatar({ user, size = 36 }: { user: any; size?: number }) {
  const initials = (user?.name || "?")
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (user?.image) {
    return <img src={user.image} alt={user.name} className="rounded-full object-cover border border-white/20" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="rounded-full bg-white/10 flex items-center justify-center text-white/60 font-bold border border-white/10"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

interface JoinRoomClientProps {
  roomId: string;
  userId: string;
  userName: string;
}

export default function JoinRoomClient({ roomId, userId, userName }: JoinRoomClientProps) {
  const router = useRouter();
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await fetch(`/api/rooms/invite/${roomId}`);
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Room not found."); return; }
        setRoom(data);
        // Check if already a member
        const alreadyMember = data.users?.some((u: any) => u._id === userId);
        if (alreadyMember) setJoined(true);
      } catch {
        setError("Could not load room details.");
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, [roomId, userId]);

  const handleJoin = async () => {
    setJoining(true);
    setError("");
    try {
      const res = await fetch(`/api/rooms/join/${roomId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to join."); return; }
      setJoined(true);
      setTimeout(() => router.push("/"), 1500);
    } catch {
      setError("Something went wrong.");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full" />
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-500"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
          </div>
          <p className="font-playfair font-bold text-xl text-[var(--foreground)]">Room Not Found</p>
          <p className="text-sm text-[var(--muted)]">{error}</p>
          <Link href="/" className="inline-block px-6 py-2.5 bg-[var(--accent)] text-[var(--background)] rounded-xl text-xs font-bold uppercase tracking-widest hover:opacity-90">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6 font-inter">
      <div className="max-w-sm w-full">
        {/* Card */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden">
          {/* Top accent */}
          <div className="h-1 bg-[var(--accent)]" />

          <div className="p-8 space-y-6">
            {/* App branding */}
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Kharche Logo" className="w-5 h-5 object-contain" />
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--muted)]">
                Kharche · Room Invite
              </p>
            </div>

            {/* Room info */}
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">You're invited to</p>
              <h1 className="text-3xl font-playfair font-bold text-[var(--foreground)] leading-tight">
                {room?.name}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] bg-[var(--border)] px-2.5 py-1 rounded-full">
                  {room?.currency}
                </span>
                <span className="text-[11px] text-[var(--muted)]">
                  {room?.users?.length ?? 0} member{(room?.users?.length ?? 0) !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Members */}
            {room?.users?.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Members</p>
                <div className="flex flex-wrap gap-2">
                  {room.users.slice(0, 6).map((u: any) => (
                    <div key={u._id} className="flex items-center gap-1.5 bg-[var(--background)] border border-[var(--border)] rounded-full px-2.5 py-1">
                      <Avatar user={u} size={18} />
                      <span className="text-xs font-medium text-[var(--foreground)]">{u.name}</span>
                    </div>
                  ))}
                  {room.users.length > 6 && (
                    <div className="flex items-center bg-[var(--background)] border border-[var(--border)] rounded-full px-2.5 py-1">
                      <span className="text-xs font-medium text-[var(--muted)]">+{room.users.length - 6} more</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Joiner info */}
            <div className="bg-[var(--background)] rounded-xl p-3 text-sm text-[var(--muted)]">
              Joining as <strong className="text-[var(--foreground)]">{userName}</strong>
            </div>

            {error && (
              <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-3 font-medium">
                {error}
              </div>
            )}

            {/* Action */}
            {joined ? (
              <div className="space-y-3 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500"><path d="M20 6 9 17l-5-5"/></svg>
                </div>
                <p className="font-bold text-[var(--foreground)]">You've joined {room?.name}!</p>
                <p className="text-xs text-[var(--muted)]">Redirecting to dashboard...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="w-full py-3.5 bg-[var(--accent)] text-[var(--background)] font-bold text-xs uppercase tracking-widest rounded-xl cursor-pointer hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {joining ? "Joining..." : `Join ${room?.name}`}
                </button>
                <Link
                  href="/"
                  className="block text-center text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  Maybe later
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
