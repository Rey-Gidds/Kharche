import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import RoomMembership from "@/models/RoomMembership";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * GET /api/rooms/[roomId]/members/status
 * Returns the calling user's own membership status for a specific room.
 * Used by JoinRoomClient to self-check on mount so it can auto-activate
 * if the creator already delivered the key while the joiner was offline.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  await connectDB();
  const session = await getSession(await headers());
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { roomId } = await params;

    const membership = await RoomMembership.findOne({
      roomId,
      userId: session.user.id,
      status: { $ne: "LEFT" },
    })
      .select("status")
      .lean();

    return NextResponse.json({ status: membership?.status ?? null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
