import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import Room from "@/models/Room";
import RoomMembership from "@/models/RoomMembership";
import { roomEventBus } from "@/lib/sse/roomEventBus";
import mongoose from "mongoose";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * POST /api/rooms/join/[roomId]
 * Authenticated user requests to join a room via invite link.
 * Creates a pending membership (KEY_EXCHANGE_PENDING) — does NOT add to room.users.
 * Emits SSE to the creator.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const session = await getSession(await headers());
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { roomId } = await params;
    await connectDB();

    const room = await Room.findById(roomId);
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    // Already a member?
    const existingMembership = await RoomMembership.findOne({
      roomId,
      userId: session.user.id,
      status: { $ne: "LEFT" },
    });

    if (existingMembership && existingMembership.status === "ACTIVE") {
      return NextResponse.json({ message: "You are already a member of this room." });
    }

    if (existingMembership && existingMembership.status === "KEY_EXCHANGE_PENDING") {
      return NextResponse.json({ message: "Join request already pending.", membershipId: existingMembership._id, status: "KEY_EXCHANGE_PENDING" });
    }

    if (existingMembership && existingMembership.status === "KEY_AVAILABLE") {
      // Key already delivered — just activate
      return NextResponse.json({ message: "Key already available. Please activate.", status: "KEY_AVAILABLE" });
    }

    // Create pending membership (upsert for re-join after LEFT)
    const membership = await RoomMembership.findOneAndUpdate(
      { roomId, userId: session.user.id },
      {
        roomId: new mongoose.Types.ObjectId(roomId),
        userId: new mongoose.Types.ObjectId(session.user.id),
        status: "KEY_EXCHANGE_PENDING",
        currentKeyVersion: 0,
        $unset: { activatedAt: "", keyDeliveredAt: "" },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Find creator (first user in room.users)
    const creatorId = room.users[0]?.toString();
    if (creatorId) {
      roomEventBus.emit(creatorId, {
        type: "MEMBER_WAITING_FOR_KEY",
        roomId: roomId.toString(),
        userId: session.user.id,
        timestamp: Date.now(),
      });
    }

    return NextResponse.json({
      membershipId: membership._id,
      status: "KEY_EXCHANGE_PENDING",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

