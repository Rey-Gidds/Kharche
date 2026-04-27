"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { formatRoomCurrency } from "@/utils/roomCurrency";
import { createPortal } from "react-dom";
import AddTicketModal from "./AddTicketModal";
import { ActionMenuDrawer } from "../ExpenseDrawer";
import { useDraggableSheet } from "@/app/hooks/useDraggableSheet";
import useSWR, { useSWRConfig } from "swr";
import { useWallet } from "@/context/WalletContext";

interface RoomTicketsProps {
  room: any;
  currentUserId: string;
  refreshTrigger: number;
}

function TicketTypeBadge({ type }: { type: string }) {
  if (type === "settlement") {
    return (
      <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
        Settlement
      </span>
    );
  }
  return null;
}

function SplitBadge({ splitType }: { splitType: string }) {
  const colors: Record<string, string> = {
    equal: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    manual: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    percentage: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    ratio: "text-pink-400 bg-pink-400/10 border-pink-400/20",
  };
  return (
    <span className={`text-[9px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-full ${colors[splitType] || "text-[var(--muted)] bg-[var(--border)] border-[var(--border)]"}`}>
      {splitType}
    </span>
  );
}



const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load tickets");
  return data;
};

export default function RoomTickets({ room, currentUserId, refreshTrigger }: RoomTicketsProps) {
  const { data: tickets = [], error: swrError, isLoading: loading, mutate: fetchTickets } = useSWR<any[]>(`/api/rooms/${room._id}/tickets`, fetcher);
  const { mutate } = useSWRConfig();
  const { refetchWallet } = useWallet();
  const error = swrError?.message || "";
  
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [detailTicket, setDetailTicket] = useState<any | null>(null);
  const [editTicket, setEditTicket] = useState<any | null>(null);
  const [mounted, setMounted] = useState(false);

  const { sheetRef: detailSheetRef, style: detailStyle, handlers: detailHandlers } = useDraggableSheet({
    isOpen: !!detailTicket,
    onClose: () => setDetailTicket(null)
  });

  useEffect(() => { setMounted(true); }, []);

  // Re-fetch when refreshTrigger changes
  useEffect(() => { fetchTickets(); }, [fetchTickets, refreshTrigger]);

  const handleDelete = async (ticketId: string) => {
    if (!confirm("Delete this ticket? All balance effects will be reversed.")) return;
    
    // Close menus immediately
    if (detailTicket?._id === ticketId) setDetailTicket(null);
    if (activeMenu === ticketId) setActiveMenu(null);

    const optimisticTickets = tickets.filter((t: any) => t._id !== ticketId);

    try {
      await fetchTickets(
        async () => {
          const res = await fetch(`/api/rooms/${room._id}/tickets/${ticketId}`, { method: "DELETE" });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to delete");
          }
          // After deletion, revalidate stats and wallet in background
          mutate(`/api/rooms/${room._id}/stats`);
          refetchWallet();
          
          return optimisticTickets; // Success: return the filtered list
        },
        {
          optimisticData: optimisticTickets,
          rollbackOnError: true,
          revalidate: true, // Re-sync with server
          populateCache: true,
        }
      );
    } catch (e: any) {
      // SWR handles rollback automatically if rollbackOnError is true
      console.error("Delete failed:", e);
      alert(e.message || "Something went wrong.");
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  if (loading && tickets.length === 0) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin h-6 w-6 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-12 text-sm text-red-500">{error}</div>;
  }

  const detailDrawer = detailTicket && (
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-md cursor-pointer animate-in fade-in duration-300" 
        onClick={() => setDetailTicket(null)} 
      />
      <div 
        ref={detailSheetRef}
        style={detailStyle}
        className="relative w-full sm:max-w-lg bg-[var(--surface)] shadow-2xl p-6 sm:p-8 flex flex-col rounded-t-3xl sm:rounded-2xl border-t sm:border border-[var(--border)] overflow-y-auto max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:fade-in sm:zoom-in-95 duration-300 sm:duration-200"
      >
        
        <div 
          className="w-full -mt-2 mb-4 pt-2 pb-2 drag-handle-area touch-none cursor-grab active:cursor-grabbing sm:hidden shrink-0"
          {...detailHandlers}
        >
          <div className="w-12 h-1.5 bg-[var(--border)] rounded-full mx-auto pointer-events-none" />
        </div>

        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TicketTypeBadge type={detailTicket.type} />
              {detailTicket.type !== "settlement" && <SplitBadge splitType={detailTicket.splitType} />}
            </div>
            <h3 className="text-xl font-playfair font-bold text-[var(--foreground)] mt-2">{detailTicket.title}</h3>
          </div>
          <button onClick={() => setDetailTicket(null)} className="p-2 -mr-2 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer bg-[var(--background)] sm:bg-transparent rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
            <div>
              <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-0.5">Total Amount</p>
              <p className="font-playfair font-bold text-2xl text-[var(--foreground)]">
                {formatRoomCurrency(detailTicket.totalAmount, room.currency)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-0.5">
                {detailTicket.type === "settlement" ? "Paid by" : "Paid by"}
              </p>
              <p className="text-sm font-bold text-[var(--foreground)]">
                {detailTicket.creatorId?.name}
                {detailTicket.creatorId?._id === currentUserId && " (you)"}
              </p>
            </div>
          </div>

          {detailTicket.description && (
            <div>
              <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-[var(--foreground)] opacity-70 italic">{detailTicket.description}</p>
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Date</p>
            <p className="text-sm text-[var(--foreground)]">{formatDate(detailTicket.createdAt)}</p>
          </div>

          {detailTicket.type === "expense" && detailTicket.distribution?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-3">Distribution</p>
              <div className="space-y-2">
                {detailTicket.distribution.map((d: any) => (
                  <div key={d.userId?._id ?? d.userId} className="flex items-center justify-between py-2 border-b border-[var(--border)]/50">
                    <span className="text-sm text-[var(--foreground)] font-medium">
                      {d.userId?.name ?? "Unknown"}
                      {(d.userId?._id ?? d.userId) === currentUserId && " (you)"}
                      {(d.userId?._id ?? d.userId)?.toString() === detailTicket.creatorId?._id?.toString() && (
                        <span className="ml-1.5 text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full uppercase">payer</span>
                      )}
                    </span>
                    <span className="font-playfair font-bold text-sm text-[var(--foreground)]">
                      {formatRoomCurrency(d.amount, room.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {detailTicket.type === "settlement" && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                {detailTicket.creatorId?.name} paid {detailTicket.bearerId?.name} {formatRoomCurrency(detailTicket.totalAmount, room.currency)}
              </p>
            </div>
          )}


        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-1">
      {tickets.length === 0 ? (
        <div className="text-center py-16 text-sm text-[var(--muted)] italic">
          No expenses yet. Add one to get started.
        </div>
      ) : (
        tickets.map((ticket: any, index: number) => {
          const isSettlement = ticket.type === "settlement";
          const payer = ticket.creatorId;
          const isPayerYou = payer?._id === currentUserId || payer?._id?.toString() === currentUserId;
          // Find your share
          const myEntry = ticket.distribution?.find(
            (d: any) => (d.userId?._id ?? d.userId)?.toString() === currentUserId
          );

          return (
            <div
              key={ticket._id}
              className={`flex items-start gap-4 p-4 rounded-xl hover:bg-[var(--surface)] border cursor-pointer transition-all ${
                isSettlement ? "border-emerald-500/20 bg-emerald-500/5" : "border-transparent hover:border-[var(--border)]"
              }`}
              onClick={() => setDetailTicket(ticket)}
            >
              {/* Icon */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                isSettlement ? "bg-emerald-500/20" : "bg-[var(--border)]"
              }`}>
                {isSettlement ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--muted)]"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-widest mb-0.5 truncate">
                  {isSettlement
                    ? `${payer?.name ?? "?"} → ${ticket.bearerId?.name ?? "?"}`
                    : `By ${isPayerYou ? "you" : payer?.name ?? "?"}`
                  }
                </p>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[13px] md:text-sm text-[var(--foreground)] truncate leading-tight">{ticket.title}</p>
                </div>
                {!isSettlement && (
                  <div className="hidden sm:flex items-center gap-1.5 mt-1.5">
                    <SplitBadge splitType={ticket.splitType} />
                    {ticket.involvedUsers?.length > 0 && (
                      <span className="text-[9px] text-[var(--muted)]">{ticket.involvedUsers.length} people</span>
                    )}
                  </div>
                )}
                <p className="text-[9px] text-[var(--muted)] mt-1.5">
                  {formatDate(ticket.createdAt)}
                </p>
              </div>

              {/* Amount */}
              <div className="text-right shrink-0">
                <p className="font-playfair font-bold text-[var(--foreground)]">
                  {formatRoomCurrency(ticket.totalAmount, room.currency)}
                </p>
                {myEntry && !isPayerYou && (
                  <p className="text-[10px] text-rose-500 font-bold mt-0.5">
                    Your share: {formatRoomCurrency(myEntry.amount, room.currency)}
                  </p>
                )}
                {myEntry && isPayerYou && (
                  <p className="text-[10px] text-[var(--muted)] mt-0.5">
                    Your share: {formatRoomCurrency(myEntry.amount, room.currency)}
                  </p>
                )}
              </div>

              {/* Action Menu (3-dots) */}
              <button
                onClick={(e) => { e.stopPropagation(); setActiveMenu(ticket._id); }}
                className="shrink-0 p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors cursor-pointer rounded"
                title="Options"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
              </button>
            </div>
          );
        })
      )}

      {mounted && detailDrawer && createPortal(detailDrawer, document.body)}
      {mounted && activeMenu && createPortal(
        <ActionMenuDrawer
          isOpen={!!activeMenu}
          onClose={() => setActiveMenu(null)}
          title={tickets.find((t) => t._id === activeMenu)?.title}
          subtitle={tickets.find((t) => t._id === activeMenu)?.type === "settlement" ? "Settlement" : `Paid by ${tickets.find((t) => t._id === activeMenu)?.creatorId?.name ?? "Someone"}`}
          amount={tickets.find((t) => t._id === activeMenu) ? formatRoomCurrency(tickets.find((t) => t._id === activeMenu).totalAmount, room.currency) : undefined}
          onView={() => {
            const t = tickets.find((t) => t._id === activeMenu);
            if (t) setDetailTicket(t);
          }}
          onEdit={() => {
            const t = tickets.find((t) => t._id === activeMenu);
            if (t) setEditTicket(t);
          }}
          onDelete={() => {
            if (activeMenu) handleDelete(activeMenu);
          }}
          canEditDelete={
            (() => {
              const t = tickets.find((t) => t._id === activeMenu);
              if (!t || t.type === "settlement") return false;
              const cid = t.creatorId?._id || t.creatorId;
              return cid?.toString() === currentUserId;
            })()
          }
        />,
        document.body
      )}
      <AddTicketModal
        isOpen={!!editTicket}
        onClose={() => setEditTicket(null)}
        onSuccess={() => {
          setEditTicket(null);
          fetchTickets();
        }}
        room={room}
        currentUserId={currentUserId}
        initialData={editTicket}
      />
    </div>
  );
}
