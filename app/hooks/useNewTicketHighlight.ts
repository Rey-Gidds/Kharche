"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Tracks which tickets are "new" for the current user in a given room,
 * based on the `lastVisitedAt` timestamp returned by the visit API.
 *
 * Flow:
 *  1. On mount: call GET /api/rooms/[roomId]/visit — returns the PREVIOUS
 *     lastVisitedAt and atomically updates it to now.
 *  2. Tickets with createdAt > lastVisitedAt are considered "new".
 *  3. Clicking a highlighted ticket dismisses it — stored in sessionStorage
 *     so it survives re-mounts within the same tab but not across sessions.
 */
export function useNewTicketHighlight(roomId: string) {
  const [lastVisitedAt, setLastVisitedAt] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Fetch lastVisitedAt on mount (plain fetch — intentionally NOT SWR to avoid caching)
  useEffect(() => {
    if (!roomId) return;

    fetch(`/api/rooms/${roomId}/visit`)
      .then((r) => {
        if (!r.ok) throw new Error("visit fetch failed");
        return r.json();
      })
      .then((data) => setLastVisitedAt(data.lastVisitedAt ?? null))
      .catch((err) => console.error("[useNewTicketHighlight] visit error:", err));
  }, [roomId]);

  // Load dismissed IDs from sessionStorage on mount
  useEffect(() => {
    if (!roomId) return;
    const key = `dismissed:${roomId}`;
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) setDismissedIds(new Set(JSON.parse(raw)));
    } catch {
      // sessionStorage unavailable (private mode, etc.) — silently skip
    }
  }, [roomId]);

  /** Mark a ticket as dismissed — removes the highlight for this session. */
  const dismiss = useCallback(
    (ticketId: string) => {
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.add(ticketId);
        const key = `dismissed:${roomId}`;
        try {
          sessionStorage.setItem(key, JSON.stringify([...next]));
        } catch {
          // ignore sessionStorage errors
        }
        return next;
      });
    },
    [roomId]
  );

  /**
   * Returns true if a ticket should be highlighted as "new".
   * A ticket is new when:
   *  - lastVisitedAt has been loaded (not null)
   *  - the ticket was created AFTER lastVisitedAt
   *  - the ticket hasn't been dismissed in this session
   */
  const isNew = useCallback(
    (ticket: { _id: string; createdAt: string }): boolean => {
      if (!lastVisitedAt) return false;
      if (dismissedIds.has(ticket._id)) return false;
      return new Date(ticket.createdAt) > new Date(lastVisitedAt);
    },
    [lastVisitedAt, dismissedIds]
  );

  return { isNew, dismiss };
}
