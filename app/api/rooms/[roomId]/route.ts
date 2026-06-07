import { auth } from "@/lib/auth";
import { getCachedSession } from "@/lib/cachedSession";
import { connectDB } from "@/lib/db";
import Room from "@/models/Room";
import { requireActiveMembership } from "@/lib/rooms/membershipGuard";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/** GET /api/rooms/[roomId] — Get room details (user must have ACTIVE membership) */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const session = await getCachedSession(await headers());
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { roomId } = await params;
    await connectDB();

    // ACTIVE membership required
    try {
      await requireActiveMembership(roomId, session.user.id);
    } catch {
      return NextResponse.json({ error: "Active membership required" }, { status: 403 });
    }

    const room = await Room.findById(roomId)
      .populate("users", "name email image")
      .lean();

    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    return NextResponse.json(room);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
