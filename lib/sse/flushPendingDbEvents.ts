import { connectDB } from "@/lib/db";
import RoomMembership from "@/models/RoomMembership";
import type { RoomEvent } from "@/lib/sse/roomEventBus";

/**
 * Flushes any DB-backed pending events to a newly connected SSE user.
 * Called immediately after roomEventBus.subscribe() so the user never
 * misses events that fired while they were offline.
 *
 * Creator path: finds KEY_EXCHANGE_PENDING members in rooms where the
 *   user is ACTIVE → emits MEMBER_WAITING_FOR_KEY for each.
 *
 * Joiner path: finds rooms where the user's own membership is KEY_AVAILABLE
 *   → emits ROOM_KEY_AVAILABLE for each.
 */
export async function flushPendingDbEvents(
  userId: string,
  controller: ReadableStreamDefaultController
): Promise<void> {
  try {
    await connectDB();

    const encode = (event: RoomEvent) => {
      const data = JSON.stringify(event);
      return new TextEncoder().encode(
        `event: ${event.type}\ndata: ${data}\n\n`
      );
    };

    // ── Creator path ──────────────────────────────────────────────────────────
    // Find all rooms where this user is ACTIVE, then find KEY_EXCHANGE_PENDING
    // members in those rooms (excluding self — the creator already knows their own status).
    const activeMemberships = await RoomMembership.find({
      userId,
      status: "ACTIVE",
    })
      .select("roomId")
      .lean();

    if (activeMemberships.length > 0) {
      const activeRoomIds = activeMemberships.map((m) => m.roomId);

      const pendingMembers = await RoomMembership.find({
        roomId: { $in: activeRoomIds },
        status: "KEY_EXCHANGE_PENDING",
        userId: { $ne: userId },
      })
        .select("roomId userId")
        .lean();

      for (const pending of pendingMembers) {
        try {
          controller.enqueue(
            encode({
              type: "MEMBER_WAITING_FOR_KEY",
              roomId: pending.roomId.toString(),
              userId: pending.userId.toString(),
              timestamp: Date.now(),
            })
          );
        } catch {
          // Stream may have closed; stop gracefully
          return;
        }
      }
    }

    // ── Joiner path ───────────────────────────────────────────────────────────
    // Find rooms where this user's membership is KEY_AVAILABLE — meaning the
    // creator delivered the key while the user was offline.
    const keyAvailableMemberships = await RoomMembership.find({
      userId,
      status: "KEY_AVAILABLE",
    })
      .select("roomId")
      .lean();

    for (const m of keyAvailableMemberships) {
      try {
        controller.enqueue(
          encode({
            type: "ROOM_KEY_AVAILABLE",
            roomId: m.roomId.toString(),
            timestamp: Date.now(),
          })
        );
      } catch {
        return;
      }
    }
  } catch {
    // DB errors during flush should never crash the SSE stream
  }
}
