"use client";

import { useState, useEffect, useCallback } from "react";
import { fromSmallestUnit, formatRoomCurrency } from "@/utils/roomCurrency";
import { SUPPORTED_ROOM_CURRENCIES } from "@/utils/roomCurrency";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (room: any) => void;
}

export default function CreateRoomModal({ isOpen, onClose, onSuccess }: CreateRoomModalProps) {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) { setName(""); setCurrency("INR"); setError(""); }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), currency }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to create room"); return; }
      onSuccess(data.room);
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--surface)] w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border-t sm:border border-[var(--border)] shadow-2xl overflow-hidden">
        {/* Mobile drag handle */}
        <div className="w-12 h-1.5 bg-[var(--border)] rounded-full mx-auto mt-4 mb-2 sm:hidden" />
        <div className="flex items-center justify-between px-5 pb-4 sm:p-6 sm:border-b border-[var(--border)]">
          <h2 className="text-xl font-playfair font-bold text-[var(--foreground)]">Create a Room</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--border)] rounded-full transition-colors text-[var(--muted)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 pb-8 sm:p-6 space-y-6">
          {error && (
            <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-3 font-medium">
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Room Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Goa Trip 2024"
              maxLength={60}
              required
              autoFocus
              className="w-full py-2 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none text-[var(--foreground)] font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full py-2 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none text-[var(--foreground)] cursor-pointer font-medium"
            >
              {SUPPORTED_ROOM_CURRENCIES.map((c) => (
                <option key={c} value={c} className="bg-[var(--surface)]">{c}</option>
              ))}
            </select>
            <p className="text-[10px] text-[var(--muted)] mt-1">Currency is fixed for the entire room and cannot be changed later.</p>
          </div>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-3.5 bg-[var(--accent)] text-[var(--background)] font-bold text-xs uppercase tracking-widest rounded-xl cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Room"}
          </button>
        </form>
      </div>
    </div>
  );
}
