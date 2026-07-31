import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import Room from "@/models/Room";
import RoomStats from "@/models/RoomStats";
import User from "@/models/User";
import { requireActiveMembership } from "@/lib/rooms/membershipGuard";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// Connect once on container start
await connectDB();

// Connect once on container start

/**
 * GET /api/rooms/[roomId]/stats
 * Returns ONLY the current user's RoomStats with populated member names.
 * Privacy: never exposes other users' stats.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const session = await getSession(await headers());
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { roomId } = await params;

    // ACTIVE membership required
    try {
      await requireActiveMembership(roomId, session.user.id);
    } catch {
      return NextResponse.json({ error: "Active membership required" }, { status: 403 });
    }

    const room = await Room.findById(roomId).lean();

    // Fetch only THIS user's stats
    const stats = await RoomStats.findOne({ roomId, userId: session.user.id }).lean();
    if (!stats) return NextResponse.json({ balances: [] });

    // Populate user names for each balance entry
    const otherUserIds = stats.balances.map((b: any) => b.userId);
    const users = await User.find({ _id: { $in: otherUserIds } })
      .select("name email image")
      .lean();
    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

    const enrichedBalances = stats.balances.map((b: any) => ({
      userId: b.userId.toString(),
      amount: b.amount,
      user: userMap.get(b.userId.toString()) ?? { name: "Unknown", image: null },
    }));

    return NextResponse.json({
      roomId,
      userId: session.user.id,
      currency: room?.currency ?? "INR",
      balances: enrichedBalances,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
