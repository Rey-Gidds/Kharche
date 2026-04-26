"use client";

import { useState, useCallback } from "react";
import RoomTickets from "./RoomTickets";
import RoomBalances from "./RoomBalances";
import RoomMembers from "./RoomMembers";
import AddTicketModal from "./AddTicketModal";
import InviteLinkModal from "./InviteLinkModal";
import ActionFab from "../ActionFab";

type RoomTab = "tickets" | "balances" | "members";

interface RoomViewProps {
  room: any;
  currentUserId: string;
  onBack: () => void;
  onLeft: () => void;
}

export default function RoomView({ room, currentUserId, onBack, onLeft }: RoomViewProps) {
  const [tab, setTab] = useState<RoomTab>("tickets");
  const [addTicketOpen, setAddTicketOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = useCallback(() => setRefreshTrigger((p) => p + 1), []);

  const tabs: { key: RoomTab; label: string; icon: React.ReactNode }[] = [
    {
      key: "tickets",
      label: "Expenses",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
    },
    {
      key: "balances",
      label: "Balances",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      ),
    },
    {
      key: "members",
      label: "Members",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-4 md:space-y-8 pb-12 md:pb-24">
      {/* Room Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-2 hover:bg-[var(--border)] rounded-full text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer mt-0.5 shrink-0"
            title="Back to Rooms"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl md:text-2xl font-playfair font-bold text-[var(--foreground)] tracking-tight truncate">
                {room.name}
              </h2>
              <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted)] bg-[var(--border)] px-2.5 py-1 rounded-full shrink-0">
                {room.currency}
              </span>
            </div>
            <p className="text-[11px] text-[var(--muted)] mt-1">
              {room.users?.length ?? 0} member{(room.users?.length ?? 0) !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-1.5 p-2 md:px-3 md:py-1.5 border border-[var(--border)] rounded-lg text-[11px] font-bold text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)]/50 transition-all cursor-pointer"
            title="Invite"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            <span className="hidden sm:inline">Invite</span>
          </button>

        </div>
      </div>

      {/* Tab Navigation — scrollable on mobile to prevent overflow */}
      <div className="flex items-center gap-0 border-b border-[var(--border)] overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 pb-3 text-[11px] font-bold uppercase tracking-[0.2em] transition-all relative cursor-pointer shrink-0 ${
              tab === t.key
                ? "text-[var(--accent)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {t.icon}
            {t.label}
            {tab === t.key && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--accent)]" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <section>
        {tab === "tickets" && (
          <RoomTickets
            room={room}
            currentUserId={currentUserId}
            refreshTrigger={refreshTrigger}
          />
        )}
        {tab === "balances" && (
          <RoomBalances
            roomId={room._id}
            currency={room.currency}
          />
        )}
        {tab === "members" && (
          <RoomMembers
            room={room}
            currentUserId={currentUserId}
            onLeave={onLeft}
          />
        )}
      </section>

      {/* Modals */}
      <AddTicketModal
        isOpen={addTicketOpen}
        onClose={() => setAddTicketOpen(false)}
        onSuccess={() => {
          setAddTicketOpen(false);
          refresh();
          // Switch to balances after adding so user sees impact
        }}
        room={room}
        currentUserId={currentUserId}
      />

      <InviteLinkModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        roomId={room._id}
        roomName={room.name}
      />

      <ActionFab 
        onAddExpense={() => setAddTicketOpen(true)}
        onAddBook={() => {}} // Not used in room
        isInsideRoom={true}
      />
    </div>
  );
}
