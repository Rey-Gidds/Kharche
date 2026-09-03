"use client";

import { useState } from "react";
import RoomCard from "@/app/components/rooms/RoomCard";

export default function InteractiveRoomsMock() {
  const [selectedRoomId, setSelectedRoomId] = useState<string>("room_1");

  const rooms = [
    {
      _id: "room_1",
      name: "Kyoto Villa Retreat",
      currency: "JPY",
      netBalance: -45000, // <0 means you are owed money
      users: [
        { name: "Reyansh Gupta", image: null },
        { name: "Sophia Laurent", image: null },
        { name: "Kenji Sato", image: null },
        { name: "Elena Rostova", image: null },
      ],
      settlementPlan: [
        { from: "Sophia Laurent", to: "You", amount: "¥30,000" },
        { from: "Kenji Sato", to: "You", amount: "¥15,000" },
      ],
    },
    {
      _id: "room_2",
      name: "Lisbon Flatmates 2026",
      currency: "EUR",
      netBalance: 120, // >0 means you owe others
      users: [
        { name: "Reyansh Gupta", image: null },
        { name: "Mateo Silva", image: null },
        { name: "Camille Dupont", image: null },
      ],
      settlementPlan: [{ from: "You", to: "Mateo Silva", amount: "€120.00" }],
    },
    {
      _id: "room_3",
      name: "Goa Weekend Getaway",
      currency: "INR",
      netBalance: 0, // Settled
      users: [
        { name: "Reyansh Gupta", image: null },
        { name: "Aarav Sharma", image: null },
      ],
      settlementPlan: [],
    },
  ];

  const activeRoom = rooms.find((r) => r._id === selectedRoomId) || rooms[0];

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3.5 sm:p-6 shadow-sm space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3 sm:pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-playfair font-bold text-base sm:text-lg text-[var(--foreground)]">
              Shared Rooms & Split Balances
            </h3>
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] bg-[var(--background)] px-2 py-0.5 rounded border border-[var(--border)]">
              Group Travel & Home
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-[var(--muted)] mt-0.5">
            Share expenses with friends or flatmates. Kharche calculates the fewest payments needed to settle up.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Room Cards Column */}
        <div className="lg:col-span-7 space-y-3">
          {rooms.map((room) => {
            const isSelected = selectedRoomId === room._id;
            return (
              <div
                key={room._id}
                className={`transition-all ${
                  isSelected ? "ring-2 ring-[var(--foreground)] rounded-2xl" : ""
                }`}
              >
                <RoomCard
                  room={room}
                  onClick={() => setSelectedRoomId(room._id)}
                />
              </div>
            );
          })}
        </div>

        {/* Dynamic Settlement Engine Preview */}
        <div className="lg:col-span-5 bg-[var(--background)] border border-[var(--border)] rounded-xl p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--muted)]">
                Settlement Summary
              </span>
              <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider">
                Fewest Payments
              </span>
            </div>

            <div>
              <p className="text-xs text-[var(--muted)] uppercase font-semibold tracking-wider">
                Selected Room
              </p>
              <h4 className="font-playfair font-bold text-xl text-[var(--foreground)] mt-0.5">
                {activeRoom.name}
              </h4>
              <p className="text-xs text-[var(--muted)] mt-1">
                Room Currency:{" "}
                <span className="font-bold text-[var(--foreground)]">
                  {activeRoom.currency}
                </span>
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-[var(--border)]">
              <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--muted)]">
                Suggested Payments to Settle
              </p>

              {activeRoom.settlementPlan.length > 0 ? (
                activeRoom.settlementPlan.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--foreground)]">
                        {s.from}
                      </span>
                      <span className="text-[var(--muted)]">pays</span>
                      <span className="font-medium text-[var(--foreground)]">
                        {s.to}
                      </span>
                    </div>
                    <span className="font-playfair font-bold text-[var(--foreground)]">
                      {s.amount}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center rounded-lg bg-[var(--surface)] border border-dashed border-[var(--border)]">
                  <span className="text-xs text-emerald-500 font-semibold block">
                    ✓ All balances are settled up
                  </span>
                  <span className="text-[10px] text-[var(--muted)]">
                    No payments needed
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--muted)]">
            <span>Invite members via link or QR</span>
            <span className="text-[var(--foreground)] font-medium">Automatic Split</span>
          </div>
        </div>
      </div>
    </div>
  );
}
