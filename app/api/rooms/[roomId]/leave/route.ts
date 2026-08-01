import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import Room from "@/models/Room";
import RoomStats from "@/models/RoomStats";
import RoomMembership from "@/models/RoomMembership";
import User from "@/models/User";
import { roomEventBus } from "@/lib/sse/roomEventBus";
import mongoose from "mongoose";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * DELETE /api/rooms/[roomId]/leave
 * User leaves a room. Blocked if the user has any non-zero balances.
 * Updates membership to LEFT and emits SSE to remaining members.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  await connectDB();
  const session = await getSession(await headers());
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { roomId } = await params;

    // Check membership
    const room = await Room.findById(roomId);
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const isMember = room.users.some((uid: any) => uid.toString() === session.user.id);
    if (!isMember) return NextResponse.json({ error: "You are not a member of this room" }, { status: 403 });

    // Guard: check for outstanding balances
    const stats = await RoomStats.findOne({ roomId, userId: session.user.id }).lean();
    if (stats) {
      const hasDebt = stats.balances.some((b: any) => b.amount !== 0);
      if (hasDebt) {
        return NextResponse.json(
          { error: "You cannot leave a room while you have outstanding balances. Please settle all debts first." },
          { status: 400 }
        );
      }
    }

    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      const userId = new mongoose.Types.ObjectId(session.user.id);

      // Get remaining user IDs before removing the leaver
      const remainingUserIds = (room.users as mongoose.Types.ObjectId[])
        .filter((uid) => uid.toString() !== session.user.id)
        .map((uid) => uid.toString());

      // Remove user from room
      await Room.updateOne(
        { _id: roomId },
        { $pull: { users: userId } },
        { session: mongoSession }
      );

      // Remove room from user's rooms
      await User.updateOne(
        { _id: userId },
        { $pull: { rooms: new mongoose.Types.ObjectId(roomId) } },
        { session: mongoSession }
      );

      // Delete this user's RoomStats
      await RoomStats.deleteOne({ roomId, userId: session.user.id }, { session: mongoSession });

      // Remove the user from all other members' balances
      await RoomStats.updateMany(
        { roomId },
        { $pull: { balances: { userId } } },
        { session: mongoSession }
      );

      // Update membership to LEFT (no server-side key rotation)
      await RoomMembership.updateOne(
        { roomId, userId: session.user.id },
        { status: "LEFT" },
        { session: mongoSession }
      );

      await mongoSession.commitTransaction();
      mongoSession.endSession();

      // Emit SSE to all remaining ACTIVE members
      if (remainingUserIds.length > 0) {
        roomEventBus.emitToRoom(remainingUserIds, {
          type: "MEMBER_LEFT",
          roomId,
          userId: session.user.id,
          timestamp: Date.now(),
        });
      }

      return NextResponse.json({ message: "You have left the room successfully." });
    } catch (txErr) {
      await mongoSession.abortTransaction();
      mongoSession.endSession();
      throw txErr;
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
