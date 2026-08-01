import { connectDB } from "@/lib/db";
import Room from "@/models/Room";
import { NextResponse } from "next/server";

/**
 * GET /api/rooms/invite/[roomId]
 * Public endpoint — returns basic room info for the invite page.
 * No auth required so the link works for anyone.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  await connectDB();
  try {
    const { roomId } = await params;

    const room = await Room.findById(roomId)
      .populate("users", "name image")
      .select("name currency users createdAt")
      .lean();

    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    return NextResponse.json(room);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
