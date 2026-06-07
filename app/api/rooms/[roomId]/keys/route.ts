import { getCachedSession } from "@/lib/cachedSession";
import { connectDB } from "@/lib/db";
import Room from "@/models/Room";
import RoomKeyVersion from "@/models/RoomKeyVersion";
import RoomKeyAccess from "@/models/RoomKeyAccess";
import RoomMembership from "@/models/RoomMembership";
import { roomEventBus } from "@/lib/sse/roomEventBus";
import mongoose from "mongoose";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * POST /api/rooms/[roomId]/keys
 * Client posts a new room key (versioned). Only the room creator can do this.
 * Body: { keyVersion, encryptedName?, keyPackages: [{ userId, encryptedRoomKey }] }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const session = await getCachedSession(await headers());
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { roomId } = await params;
    const { keyVersion, encryptedName, keyPackages } = await req.json();

    if (!keyVersion || !keyPackages || !Array.isArray(keyPackages) || keyPackages.length === 0) {
      return NextResponse.json({ error: "keyVersion and keyPackages are required" }, { status: 400 });
    }

    await connectDB();
    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      const room = await Room.findById(roomId).session(mongoSession);
      if (!room) {
        await mongoSession.abortTransaction();
        mongoSession.endSession();
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
      }

      // Verify caller is the room creator
      const creatorMembership = await RoomMembership.findOne({
        roomId,
        userId: session.user.id,
        status: "ACTIVE",
      }).session(mongoSession);

      if (!creatorMembership) {
        await mongoSession.abortTransaction();
        mongoSession.endSession();
        return NextResponse.json({ error: "Only active members can distribute keys" }, { status: 403 });
      }

      // Validate keyVersion
      const expectedVersion = room.activeKeyVersion + 1;
      if (keyVersion !== expectedVersion) {
        await mongoSession.abortTransaction();
        mongoSession.endSession();
        return NextResponse.json({
          error: `Invalid key version. Expected ${expectedVersion}, got ${keyVersion}`,
        }, { status: 400 });
      }

      // Create RoomKeyVersion doc (lightweight tracker — no encryptedKey)
      await RoomKeyVersion.create(
        [{
          roomId: new mongoose.Types.ObjectId(roomId),
          version: keyVersion,
          rotatedBy: new mongoose.Types.ObjectId(session.user.id),
        }],
        { session: mongoSession }
      );

      // Create RoomKeyAccess records for each keyPackage
      const accessRecords = keyPackages.map((pkg: any) => ({
        roomId: new mongoose.Types.ObjectId(roomId),
        userId: new mongoose.Types.ObjectId(pkg.userId),
        keyVersion,
        encryptedRoomKey: pkg.encryptedRoomKey,
      }));
      await RoomKeyAccess.create(accessRecords, { session: mongoSession });

      // Update encryptedName if provided
      if (encryptedName) {
        room.encryptedName = encryptedName;
      }

      // Update room's active key version
      room.activeKeyVersion = keyVersion;
      await room.save({ session: mongoSession });

      // Update creator's membership key version
      creatorMembership.currentKeyVersion = keyVersion;
      await creatorMembership.save({ session: mongoSession });

      await mongoSession.commitTransaction();
      mongoSession.endSession();

      // Emit SSE to all ACTIVE members
      const activeMembers = await RoomMembership.find({
        roomId,
        status: "ACTIVE",
      }).lean();
      const activeUserIds = activeMembers.map((m) => m.userId.toString());

      roomEventBus.emitToRoom(activeUserIds, {
        type: "ROOM_KEY_ROTATED",
        roomId,
        keyVersion,
        timestamp: Date.now(),
      });

      return NextResponse.json({ keyVersion }, { status: 201 });
    } catch (txErr) {
      await mongoSession.abortTransaction();
      mongoSession.endSession();
      throw txErr;
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
