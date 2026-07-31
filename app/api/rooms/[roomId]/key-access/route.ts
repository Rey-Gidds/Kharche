import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import Room from "@/models/Room";
import RoomKeyAccess from "@/models/RoomKeyAccess";
import mongoose from "mongoose";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// Connect once on container start
await connectDB();

// Connect once on container start

/**
 * GET /api/rooms/[roomId]/key-access
 * Returns the current user's encrypted room key for the specified room.
 * Used by the client to fetch and cache the key.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const session = await getSession(await headers());
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { roomId } = await params;

    // Verify membership
    const room = await Room.findById(roomId);
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const isMember = room.users.some((u: any) => u.toString() === session.user.id);
    if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (room.activeKeyVersion === 0) {
      return NextResponse.json({ encryptedRoomKey: null, keyVersion: 0 });
    }

    // Fetch the user's key access for the current active version
    const access = await RoomKeyAccess.findOne({
      roomId,
      userId: session.user.id,
      keyVersion: room.activeKeyVersion,
    }).lean();

    if (!access) {
      return NextResponse.json({ encryptedRoomKey: null, keyVersion: room.activeKeyVersion });
    }

    return NextResponse.json({
      encryptedRoomKey: access.encryptedRoomKey,
      keyVersion: access.keyVersion,
      userId: session.user.id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
