import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import RoomMembership from "@/models/RoomMembership";
import User from "@/models/User";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// Connect once on container start
await connectDB();

// Connect once on container start

/**
 * GET /api/rooms/[roomId]/members/pending
 * Lists KEY_EXCHANGE_PENDING members for a room. Only the creator can view.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const session = await getSession(await headers());
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { roomId } = await params;

    // Verify caller is an ACTIVE member (must be creator or someone who can distribute keys)
    const callerMembership = await RoomMembership.findOne({
      roomId,
      userId: session.user.id,
    });

    if (!callerMembership || callerMembership.status !== "ACTIVE") {
      return NextResponse.json({ error: "Active membership required" }, { status: 403 });
    }

    const pendingMemberships = await RoomMembership.find({
      roomId,
      status: "KEY_EXCHANGE_PENDING",
    }).lean();

    // Fetch user info for each pending member
    const userIds = pendingMemberships.map((m) => m.userId);
    const users = await User.find({ _id: { $in: userIds } })
      .select("name email image")
      .lean();

    const userMap = new Map(users.map((u) => [(u as any)._id.toString(), u]));

    const members = pendingMemberships.map((m) => ({
      userId: m.userId,
      name: userMap.get(m.userId.toString())?.name ?? "Unknown",
      image: userMap.get(m.userId.toString())?.image ?? null,
      createdAt: m.createdAt,
    }));

    return NextResponse.json({ members });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
