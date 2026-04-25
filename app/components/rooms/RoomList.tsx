"use client";

import { useState, useEffect, useCallback } from "react";
import RoomCard from "./RoomCard";
import RoomView from "./RoomView";
import CreateRoomModal from "./CreateRoomModal";

interface RoomListProps {
  currentUserId: string;
}

export default function RoomList({ currentUserId }: RoomListProps) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/rooms");
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to load rooms"); return; }
      setRooms(data);
    } catch {
      setError("Failed to load rooms.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const handleSelectRoom = async (room: any) => {
    // Re-fetch full room details with populated users
    try {
      const res = await fetch(`/api/rooms/${room._id}`);
      const data = await res.json();
      if (res.ok) setSelectedRoom(data);
    } catch {
      setSelectedRoom(room);
    }
  };

  const handleLeft = () => {
    setSelectedRoom(null);
    fetchRooms();
  };

  if (selectedRoom) {
    return (
      <RoomView
        room={selectedRoom}
        currentUserId={currentUserId}
        onBack={() => setSelectedRoom(null)}
        onLeft={handleLeft}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-playfair font-bold text-[var(--foreground)] tracking-tight">
          Rooms
        </h2>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-[var(--background)] rounded-xl text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          New Room
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-6 w-6 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-12">
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <button
            onClick={fetchRooms}
            className="text-xs font-bold uppercase tracking-widest text-[var(--accent)] hover:opacity-70 cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && rooms.length === 0 && (
        <div className="text-center py-16 border border-dashed border-[var(--border)] rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-[var(--border)] flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--muted)]">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <p className="font-playfair font-bold text-lg text-[var(--foreground)] mb-1">No rooms yet</p>
          <p className="text-sm text-[var(--muted)] mb-6">Create a room and invite others to split expenses together.</p>
          <button
            onClick={() => setCreateOpen(true)}
            className="px-6 py-2.5 bg-[var(--accent)] text-[var(--background)] rounded-xl text-[11px] font-bold uppercase tracking-widest hover:opacity-90 cursor-pointer"
          >
            Create Your First Room
          </button>
        </div>
      )}

      {/* Room Cards */}
      {!loading && rooms.length > 0 && (
        <div className="grid grid-cols-1 gap-3">
          {rooms.map((room) => (
            <RoomCard
              key={room._id}
              room={room}
              onClick={() => handleSelectRoom(room)}
            />
          ))}
        </div>
      )}

      <CreateRoomModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={(newRoom) => {
          setCreateOpen(false);
          fetchRooms();
        }}
      />
    </div>
  );
}
