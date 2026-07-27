"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/lib/auth-client";
import { useNotification } from "@/context/NotificationContext";

interface PendingActivation {
  roomId: string;
  roomName: string;
}

/**
 * Runs once per app session when the user is authenticated.
 * Checks for any KEY_AVAILABLE memberships (rooms where the creator
 * delivered the key while the joiner was offline) and activates them
 * silently in the background, showing a toast on success.
 */
export function usePendingRoomActivations() {
  const { data: session, isPending } = useSession();
  const { showNotification } = useNotification();
  // Guard: run only once per mount, even across re-renders
  const hasRun = useRef(false);

  useEffect(() => {
    // Wait for session to resolve; only run for authenticated users
    if (isPending || !session?.user?.id || hasRun.current) return;
    hasRun.current = true;

    const run = async () => {
      try {
        const res = await fetch("/api/rooms/members/pending-activations");
        if (!res.ok) return; // Silently ignore — non-critical path

        const data = await res.json();
        const activations: PendingActivation[] = data.pendingActivations ?? [];
        if (activations.length === 0) return;

        // Process activations concurrently
        await Promise.allSettled(
          activations.map(async ({ roomId, roomName }) => {
            try {
              const activateRes = await fetch(
                `/api/rooms/${roomId}/members/activate`,
                { method: "POST" }
              );
              if (activateRes.ok) {
                showNotification(
                  `🎉 You've joined ${roomName}!`,
                  "success"
                );
              }
            } catch {
              // Silent failure — user can retry via the join link
            }
          })
        );
      } catch {
        // Silent failure — non-critical background task
      }
    };

    run();
  }, [isPending, session?.user?.id, showNotification]);
}
