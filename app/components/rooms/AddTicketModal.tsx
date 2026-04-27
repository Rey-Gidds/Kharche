"use client";

import { useState, useEffect, useCallback } from "react";
import { fromSmallestUnit, toSmallestUnit, formatRoomCurrency } from "@/utils/roomCurrency";
import { calculateSplit } from "@/lib/rooms/splitCalculator";
import { useSWRConfig } from "swr";
import { useWallet } from "@/context/WalletContext";

type SplitType = "equal" | "manual" | "percentage" | "ratio";

interface AddTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  room: any;
  currentUserId: string;
  initialData?: any; // Pass existing ticket data for editing
}

import { useDraggableSheet } from "@/app/hooks/useDraggableSheet";

export default function AddTicketModal({ isOpen, onClose, onSuccess, room, currentUserId, initialData }: AddTicketModalProps) {
  const members: any[] = room?.users ?? [];
  const currency: string = room?.currency ?? "INR";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [payerId, setPayerId] = useState(currentUserId);
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [involvedUsers, setInvolvedUsers] = useState<string[]>(members.map((m: any) => m._id));
  const [splitData, setSplitData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { mutate } = useSWRConfig();
  const { refetchWallet } = useWallet();

  const { sheetRef, style, handlers } = useDraggableSheet({ isOpen, onClose });

  // Populate on open
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description || "");
        setAmount(fromSmallestUnit(initialData.totalAmount, currency).toString());
        setPayerId(initialData.creatorId?._id || initialData.creatorId);
        setSplitType(initialData.splitType as SplitType);
        setInvolvedUsers((initialData.involvedUsers || []).map((u: any) => u._id || u));
        
        // Reconstruct splitData for manual/percentage/ratio
        const sd: Record<string, string> = {};
        if (initialData.splitType === "manual") {
            initialData.distribution.forEach((d: any) => {
                sd[d.userId._id || d.userId] = fromSmallestUnit(d.amount, currency).toString();
            });
        }
        setSplitData(sd);
      } else {
        setTitle(""); setDescription(""); setAmount(""); setPayerId(currentUserId);
        setSplitType("equal"); setInvolvedUsers(members.map((m: any) => m._id));
        setSplitData({});
      }
      setError("");
    }
  }, [isOpen, initialData, currentUserId, currency, members]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalSmallest = amount ? toSmallestUnit(parseFloat(amount) || 0, currency) : 0;

  // Live preview of split
  const previewDistribution = (() => {
    if (!totalSmallest || involvedUsers.length === 0) return [];
    try {
      let sd: Record<string, number> | undefined;
      if (splitType === "manual") {
        sd = Object.fromEntries(
          involvedUsers.map((uid) => [uid, toSmallestUnit(parseFloat(splitData[uid] || "0") || 0, currency)])
        );
      } else if (splitType === "percentage" || splitType === "ratio") {
        sd = Object.fromEntries(
          involvedUsers.map((uid) => [uid, parseFloat(splitData[uid] || "0") || 0])
        );
      }
      return calculateSplit({ splitType, totalAmount: totalSmallest, involvedUsers, splitData: sd });
    } catch {
      return [];
    }
  })();

  const toggleInvolvedUser = (uid: string) => {
    setInvolvedUsers((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const getMember = (uid: string) => members.find((m: any) => m._id === uid);

  const ManualSum = () => {
    const sum = involvedUsers.reduce(
      (acc, uid) => acc + toSmallestUnit(parseFloat(splitData[uid] || "0") || 0, currency),
      0
    );
    const diff = totalSmallest - sum;
    return (
      <p className={`text-[10px] font-bold uppercase tracking-tight mt-1 ${Math.abs(diff) < 2 ? "text-emerald-500" : "text-rose-500"}`}>
        Total entered: {formatRoomCurrency(sum, currency)} / {formatRoomCurrency(totalSmallest, currency)}
        {Math.abs(diff) >= 2 && ` (${diff > 0 ? "short" : "over"} by ${formatRoomCurrency(Math.abs(diff), currency)})`}
      </p>
    );
  };

  const PctSum = () => {
    const sum = involvedUsers.reduce((acc, uid) => acc + (parseFloat(splitData[uid] || "0") || 0), 0);
    return (
      <p className={`text-[10px] font-bold uppercase tracking-tight mt-1 ${Math.abs(sum - 100) < 0.5 ? "text-emerald-500" : "text-rose-500"}`}>
        Total: {sum.toFixed(1)}% / 100%
      </p>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) { setError("Title is required."); return; }
    
    const parsedAmount = parseFloat(amount);
    if (!amount || parsedAmount <= 0) { setError("Enter a valid amount greater than 0."); return; }
    
    const decimalRegex = /^\d+(\.\d{1,3})?$/;
    if (!decimalRegex.test(amount)) {
      setError("Amount can only have up to 3 decimal places."); return;
    }

    if (involvedUsers.length === 0) { setError("At least one member must be involved."); return; }

    // Build splitData payload
    let payload: Record<string, number> | undefined;
    if (splitType === "manual") {
      payload = Object.fromEntries(
        involvedUsers.map((uid) => [uid, parseFloat(splitData[uid] || "0") || 0])
      );
    } else if (splitType === "percentage" || splitType === "ratio") {
      payload = Object.fromEntries(
        involvedUsers.map((uid) => [uid, parseFloat(splitData[uid] || "0") || 0])
      );
    }

    const ticketKey = `/api/rooms/${room._id}/tickets`;
    const statsKey = `/api/rooms/${room._id}/stats`;

    // Construct the ticket object for optimistic update
    const optimisticTicket = {
      _id: initialData?._id || `temp-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      totalAmount: toSmallestUnit(parseFloat(amount), currency),
      splitType,
      creatorId: members.find(m => m._id === payerId) || { _id: payerId, name: "You" },
      involvedUsers: involvedUsers.map(id => members.find(m => m._id === id) || { _id: id }),
      distribution: previewDistribution,
      type: "expense",
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    setLoading(true);
    try {
      const endpoint = initialData 
        ? `/api/rooms/${room._id}/tickets/${initialData._id}` 
        : `/api/rooms/${room._id}/tickets`;
      
      const method = initialData ? "PUT" : "POST";

      // Perform optimistic update
      await mutate(
        ticketKey,
        async () => {
          const res = await fetch(endpoint, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: title.trim(),
              description: description.trim() || undefined,
              totalAmount: parseFloat(amount),
              splitType,
              creatorId: payerId,
              involvedUsers,
              splitData: payload,
            }),
          });
          
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to save expense.");
          }

          // Trigger background revalidation for related data
          mutate(statsKey);
          refetchWallet();

          return fetch(ticketKey).then(r => r.json()); // Return fresh data from server
        },
        {
          optimisticData: (currentTickets: any[] = []) => {
            if (initialData) {
              return currentTickets.map(t => t._id === initialData._id ? optimisticTicket : t);
            } else {
              return [optimisticTicket, ...currentTickets];
            }
          },
          rollbackOnError: true,
          revalidate: true,
          populateCache: true,
        }
      );

      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const splitTabs: { key: SplitType; label: string }[] = [
    { key: "equal", label: "Equal" },
    { key: "manual", label: "Manual" },
    { key: "percentage", label: "%" },
    { key: "ratio", label: "Ratio" },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer transition-opacity animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      <div 
        ref={sheetRef}
        style={style}
        className="relative bg-[var(--surface)] w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border-t sm:border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[85vh] transition-all animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 sm:fade-in duration-300 sm:duration-200"
      >
        <div 
          className="w-full pt-4 pb-2 drag-handle-area touch-none cursor-grab active:cursor-grabbing sm:hidden shrink-0"
          {...handlers}
        >
          <div className="w-12 h-1.5 bg-[var(--border)] rounded-full mx-auto pointer-events-none" />
        </div>
        
        <div className="flex items-center justify-between px-5 pb-5 sm:p-6 sm:pt-6 border-b border-[var(--border)] shrink-0">
          <h2 className="text-xl font-playfair font-bold text-[var(--foreground)]">{initialData ? "Edit Expense" : "Add Expense"}</h2>
          <button onClick={onClose} className="p-2 -mr-2 hover:bg-[var(--border)] rounded-full transition-colors text-[var(--muted)] bg-[var(--background)] sm:bg-transparent">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {error && (
              <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-3 font-medium">
                {error}
              </div>
            )}

            {/* Title & Description */}
            <div className="grid grid-cols-1 gap-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Dinner at Mario's"
                  required
                  maxLength={100}
                  autoFocus
                  className="w-full py-2 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none text-[var(--foreground)] font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Notes (optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a note..."
                  maxLength={200}
                  className="w-full py-2 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none text-[var(--foreground)]"
                />
              </div>
            </div>

            {/* Amount */}
            <div className="grid grid-cols-1 gap-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
                  Amount ({currency})
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    const decimalParts = val.split('.');
                    if (decimalParts.length > 1 && decimalParts[1].length > 3) return;
                    setAmount(val);
                  }}
                  placeholder="0.00"
                  step="0.001"
                  min="0.001"
                  required
                  className="w-full py-2 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none font-bold text-lg text-[var(--foreground)]"
                />
              </div>
            </div>

            {/* Involved Users */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
                Split between ({involvedUsers.length} selected)
              </label>
              <div className="flex flex-wrap gap-2">
                {members.map((m: any) => {
                  const selected = involvedUsers.includes(m._id);
                  return (
                    <button
                      key={m._id}
                      type="button"
                      onClick={() => toggleInvolvedUser(m._id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all border ${
                        selected
                          ? "bg-[var(--accent)] text-[var(--background)] border-[var(--accent)]"
                          : "bg-transparent text-[var(--muted)] border-[var(--border)] hover:border-[var(--accent)]/50"
                      }`}
                    >
                      {selected && <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>}
                      {m._id === currentUserId ? `${m.name} (you)` : m.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Split Type */}
            <div className="space-y-4">
              <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Split type</label>
              <div className="flex gap-1 bg-[var(--background)] p-1 rounded-xl">
                {splitTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSplitType(tab.key)}
                    className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg cursor-pointer transition-all ${
                      splitType === tab.key
                        ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm border border-[var(--border)]"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Distribution input/preview per split type */}
              {involvedUsers.length > 0 && totalSmallest > 0 && (
                <div className="space-y-2 bg-[var(--background)] rounded-xl p-4">
                  {splitType === "equal" && (
                    <div className="space-y-1.5">
                      {previewDistribution.map((e) => {
                        const m = getMember(e.userId);
                        return (
                          <div key={e.userId} className="flex items-center justify-between text-sm">
                            <span className="text-[var(--foreground)] font-medium">{m?.name}{e.userId === currentUserId ? " (you)" : ""}</span>
                            <span className="font-bold text-[var(--foreground)]">{formatRoomCurrency(e.amount, currency)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {splitType === "manual" && (
                    <div className="space-y-3">
                      {involvedUsers.map((uid) => {
                        const m = getMember(uid);
                        return (
                          <div key={uid} className="flex items-center gap-3">
                            <span className="text-sm text-[var(--foreground)] font-medium flex-1 truncate">
                              {m?.name}{uid === currentUserId ? " (you)" : ""}
                            </span>
                            <input
                              type="number"
                              value={splitData[uid] ?? ""}
                              onChange={(e) => setSplitData((p) => ({ ...p, [uid]: e.target.value }))}
                              placeholder="0.00"
                              step="0.01"
                              min="0"
                              className="w-24 py-1 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none font-bold text-right text-[var(--foreground)]"
                            />
                          </div>
                        );
                      })}
                      <ManualSum />
                    </div>
                  )}

                  {splitType === "percentage" && (
                    <div className="space-y-3">
                      {involvedUsers.map((uid) => {
                        const m = getMember(uid);
                        const pct = parseFloat(splitData[uid] || "0") || 0;
                        const preview = Math.floor(totalSmallest * pct / 100);
                        return (
                          <div key={uid} className="flex items-center gap-3">
                            <span className="text-sm text-[var(--foreground)] font-medium flex-1 truncate">
                              {m?.name}{uid === currentUserId ? " (you)" : ""}
                            </span>
                            <span className="text-[11px] text-[var(--muted)]">{formatRoomCurrency(preview, currency)}</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={splitData[uid] ?? ""}
                                onChange={(e) => setSplitData((p) => ({ ...p, [uid]: e.target.value }))}
                                placeholder="0"
                                step="0.1"
                                min="0"
                                max="100"
                                className="w-16 py-1 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none font-bold text-right text-[var(--foreground)]"
                              />
                              <span className="text-[var(--muted)] text-sm">%</span>
                            </div>
                          </div>
                        );
                      })}
                      <PctSum />
                    </div>
                  )}

                  {splitType === "ratio" && (
                    <div className="space-y-3">
                      {(() => {
                        const ratios = involvedUsers.map((uid) => parseFloat(splitData[uid] || "0") || 0);
                        const ratioSum = ratios.reduce((a, b) => a + b, 0);
                        return involvedUsers.map((uid, i) => {
                          const m = getMember(uid);
                          const ratio = ratios[i];
                          const preview = ratioSum > 0 ? Math.floor(totalSmallest * ratio / ratioSum) : 0;
                          return (
                            <div key={uid} className="flex items-center gap-3">
                              <span className="text-sm text-[var(--foreground)] font-medium flex-1 truncate">
                                {m?.name}{uid === currentUserId ? " (you)" : ""}
                              </span>
                              <span className="text-[11px] text-[var(--muted)]">{formatRoomCurrency(preview, currency)}</span>
                              <input
                                type="number"
                                value={splitData[uid] ?? ""}
                                onChange={(e) => setSplitData((p) => ({ ...p, [uid]: e.target.value }))}
                                placeholder="1"
                                step="1"
                                min="0"
                                className="w-16 py-1 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none font-bold text-right text-[var(--foreground)]"
                              />
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="p-6 border-t border-[var(--border)] shrink-0">
            <button
              type="submit"
              disabled={loading || !title.trim() || !amount || involvedUsers.length === 0}
              className="w-full py-3.5 bg-[var(--accent)] text-[var(--background)] font-bold text-xs uppercase tracking-widest rounded-xl cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : (initialData ? "Save Changes" : "Add Expense")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
