import { getCachedSession } from "@/lib/cachedSession";
import { connectDB } from "@/lib/db";
import Room from "@/models/Room";
import RoomMembership from "@/models/RoomMembership";
import RoomKeyAccess from "@/models/RoomKeyAccess";
import User from "@/models/User";
import { initBalancesForNewMember } from "@/lib/rooms/balanceEngine";
import { roomEventBus } from "@/lib/sse/roomEventBus";
import mongoose from "mongoose";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * POST /api/rooms/[roomId]/members/activate
 * Joiner activates their membership after receiving the room key.
 * Body: {} (user activates themselves)
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const session = await getCachedSession(await headers());
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { roomId } = await params;
    await connectDB();
    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      // Verify caller has KEY_AVAILABLE membership
      const membership = await RoomMembership.findOne({
        roomId,
        userId: session.user.id,
        status: "KEY_AVAILABLE",
      }).session(mongoSession);

      if (!membership) {
        await mongoSession.abortTransaction();
        mongoSession.endSession();
        return NextResponse.json({ error: "No key available for activation. Wait for the room creator to distribute the key." }, { status: 400 });
      }

      // Verify caller has RoomKeyAccess for current activeKeyVersion
      const room = await Room.findById(roomId).session(mongoSession);
      if (!room) {
        await mongoSession.abortTransaction();
        mongoSession.endSession();
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
      }

      const keyAccess = await RoomKeyAccess.findOne({
        roomId,
        userId: session.user.id,
        keyVersion: room.activeKeyVersion,
      }).session(mongoSession);

      if (!keyAccess) {
        await mongoSession.abortTransaction();
        mongoSession.endSession();
        return NextResponse.json({ error: "Room key not available for this version" }, { status: 400 });
      }

      const existingUserIds = room.users.map((uid: any) => uid.toString());

      // Add user to room.users
      await Room.updateOne(
        { _id: roomId },
        { $addToSet: { users: new mongoose.Types.ObjectId(session.user.id) } },
        { session: mongoSession }
      );

      // Add room to User.rooms
      await User.updateOne(
        { _id: session.user.id },
        { $addToSet: { rooms: new mongoose.Types.ObjectId(roomId) } },
        { session: mongoSession }
      );

      // Initialize balances for the new member
      await initBalancesForNewMember(mongoSession, roomId, session.user.id, existingUserIds);

      // Update membership to ACTIVE
      membership.status = "ACTIVE";
      membership.activatedAt = new Date();
      membership.currentKeyVersion = room.activeKeyVersion;
      await membership.save({ session: mongoSession });

      await mongoSession.commitTransaction();
      mongoSession.endSession();

      // Emit SSE to all ACTIVE members
      const activeMembers = await RoomMembership.find({
        roomId,
        status: "ACTIVE",
      }).lean();
      const activeUserIds = activeMembers.map((m) => m.userId.toString());

      roomEventBus.emitToRoom(activeUserIds, {
        type: "MEMBERSHIP_ACTIVATED",
        roomId,
        userId: session.user.id,
        timestamp: Date.now(),
      });

      return NextResponse.json({ status: "ACTIVE" });
    } catch (txErr) {
      await mongoSession.abortTransaction();
      mongoSession.endSession();
      throw txErr;
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
