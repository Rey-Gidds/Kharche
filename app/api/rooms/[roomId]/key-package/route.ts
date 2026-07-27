import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import Room from "@/models/Room";
import RoomKeyAccess from "@/models/RoomKeyAccess";
import RoomMembership from "@/models/RoomMembership";
import { roomEventBus } from "@/lib/sse/roomEventBus";
import mongoose from "mongoose";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * POST /api/rooms/[roomId]/key-package
 * Creator delivers an encrypted room key package to a pending member.
 * Body: { targetUserId, encryptedRoomKey, keyVersion }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const session = await getSession(await headers());
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { roomId } = await params;
    const { targetUserId, encryptedRoomKey, keyVersion } = await req.json();

    if (!targetUserId || !encryptedRoomKey || keyVersion === null || keyVersion === undefined) {
      return NextResponse.json({ error: "targetUserId, encryptedRoomKey, and keyVersion are required" }, { status: 400 });
    }

    await connectDB();
    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      // Verify caller is an ACTIVE member
      const callerMembership = await RoomMembership.findOne({
        roomId,
        userId: session.user.id,
        status: "ACTIVE",
      }).session(mongoSession);

      if (!callerMembership) {
        await mongoSession.abortTransaction();
        mongoSession.endSession();
        return NextResponse.json({ error: "Active membership required" }, { status: 403 });
      }

      // Verify target has KEY_EXCHANGE_PENDING membership
      const targetMembership = await RoomMembership.findOne({
        roomId,
        userId: targetUserId,
        status: "KEY_EXCHANGE_PENDING",
      }).session(mongoSession);

      if (!targetMembership) {
        await mongoSession.abortTransaction();
        mongoSession.endSession();
        return NextResponse.json({ error: "Target user is not in KEY_EXCHANGE_PENDING status" }, { status: 400 });
      }

      // Verify the keyVersion matches the room's current active key version
      const room = await Room.findById(roomId).session(mongoSession);
      if (!room) {
        await mongoSession.abortTransaction();
        mongoSession.endSession();
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
      }

      // Create RoomKeyAccess record
      await RoomKeyAccess.create(
        [{
          roomId: new mongoose.Types.ObjectId(roomId),
          userId: new mongoose.Types.ObjectId(targetUserId),
          keyVersion,
          encryptedRoomKey,
        }],
        { session: mongoSession }
      );

      // Update membership to KEY_AVAILABLE
      targetMembership.status = "KEY_AVAILABLE";
      targetMembership.keyDeliveredAt = new Date();
      await targetMembership.save({ session: mongoSession });

      await mongoSession.commitTransaction();
      mongoSession.endSession();

      // Emit SSE to the target user
      roomEventBus.emit(targetUserId, {
        type: "ROOM_KEY_AVAILABLE",
        roomId,
        keyVersion,
        timestamp: Date.now(),
      });

      return NextResponse.json({ status: "KEY_AVAILABLE" });
    } catch (txErr) {
      await mongoSession.abortTransaction();
      mongoSession.endSession();
      throw txErr;
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
