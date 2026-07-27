import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import RoomMembership from "@/models/RoomMembership";
import Room from "@/models/Room";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * GET /api/rooms/members/pending-activations
 * Returns all rooms where the calling user's membership is KEY_AVAILABLE.
 * Used by the global RoomActivationRunner to detect and auto-activate missed key deliveries.
 */
export async function GET() {
  const session = await getSession(await headers());
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const pendingMemberships = await RoomMembership.find({
      userId: session.user.id,
      status: "KEY_AVAILABLE",
    }).lean();

    if (pendingMemberships.length === 0) {
      return NextResponse.json({ pendingActivations: [] });
    }

    const roomIds = pendingMemberships.map((m) => m.roomId);
    const rooms = await Room.find({ _id: { $in: roomIds } })
      .select("_id name")
      .lean();

    const roomMap = new Map(rooms.map((r) => [(r as any)._id.toString(), r]));

    const pendingActivations = pendingMemberships.map((m) => ({
      roomId: m.roomId.toString(),
      roomName: (roomMap.get(m.roomId.toString()) as any)?.name ?? "Unknown Room",
    }));

    return NextResponse.json({ pendingActivations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
