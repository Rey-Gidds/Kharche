"use client";

import { useState, useEffect, useCallback } from "react";
import RoomCard from "./RoomCard";
import RoomView from "./RoomView";
import CreateRoomModal from "./CreateRoomModal";
import { useProcessing } from "@/context/ProcessingContext";

interface RoomListProps {
  currentUserId: string;
}

import useSWR from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load rooms");
  return data;
};

export default function RoomList({ currentUserId }: RoomListProps) {
  const { data: rooms = [], error: swrError, isLoading: loading, mutate: fetchRooms } = useSWR<any[]>("/api/rooms", fetcher);
  const error = swrError?.message || "";
  
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const { setProcessing, isProcessing } = useProcessing();
  const [createOpen, setCreateOpen] = useState(false);

  const handleSelectRoom = async (room: any) => {
    // Navigate immediately with existing data for instant feedback
    setSelectedRoom(room);
    
    // Background fetch to ensure we have the latest/full details without blocking the UI
    const navId = `nav-${room._id}`;
    setProcessing(navId, true);
    try {
      const res = await fetch(`/api/rooms/${room._id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedRoom(data);
      }
    } catch (err) {
      console.error("Failed to refresh room details", err);
    } finally {
      setProcessing(navId, false);
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
            onClick={() => fetchRooms()}
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
              loading={isProcessing(`nav-${room._id}`)}
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
