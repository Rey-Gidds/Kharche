import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import RoomMembership from "@/models/RoomMembership";
import { requireActiveMembership } from "@/lib/rooms/membershipGuard";

/**
 * GET /api/rooms/[roomId]/visit
 *
 * Authenticated. Requires active membership.
 *
 * Returns the PREVIOUS `lastVisitedAt` timestamp, then updates it to now.
 * This allows the client to highlight only tickets created after the user's
 * last visit, without including tickets from the current session.
 *
 * Response: { lastVisitedAt: string | null }
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  await connectDB();
  const session = await getSession(await headers());
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { roomId } = await params;

    // Require active membership
    try {
      await requireActiveMembership(roomId, session.user.id);
    } catch {
      return NextResponse.json({ error: "Active membership required" }, { status: 403 });
    }

    // Find the membership doc and atomically return the old timestamp + update to now
    const membership = await RoomMembership.findOneAndUpdate(
      { roomId, userId: session.user.id },
      { $set: { lastVisitedAt: new Date() } },
      { new: false } // Return the PREVIOUS document (before update)
    ).lean();

    if (!membership) {
      return NextResponse.json({ error: "Membership not found" }, { status: 404 });
    }

    // Return the previous lastVisitedAt. If never set (first visit), fall back to activatedAt or createdAt
    const previous = membership.lastVisitedAt
      ? membership.lastVisitedAt.toISOString()
      : (membership.activatedAt || membership.createdAt || new Date()).toISOString();

    return NextResponse.json({ lastVisitedAt: previous });
  } catch (err: any) {
    console.error("[visit] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

