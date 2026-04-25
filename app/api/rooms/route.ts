import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Room from "@/models/Room";
import RoomBook from "@/models/RoomBook";
import RoomStats from "@/models/RoomStats";
import User from "@/models/User";
import { initBalancesForNewMember } from "@/lib/rooms/balanceEngine";
import { SUPPORTED_ROOM_CURRENCIES } from "@/utils/roomCurrency";
import mongoose from "mongoose";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/** POST /api/rooms — Create a new room. Creator automatically joins. */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name, currency } = await req.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Room name is required" }, { status: 400 });
    }
    if (name.trim().length > 60) {
      return NextResponse.json({ error: "Room name too long (max 60 chars)" }, { status: 400 });
    }
    if (!currency || !SUPPORTED_ROOM_CURRENCIES.includes(currency)) {
      return NextResponse.json(
        { error: `Invalid currency. Supported: ${SUPPORTED_ROOM_CURRENCIES.join(", ")}` },
        { status: 400 }
      );
    }

    await connectDB();
    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      const creatorId = new mongoose.Types.ObjectId(session.user.id);

      // 1. Create Room (bookId will be set after creating RoomBook)
      const [room] = await Room.create(
        [{ name: name.trim(), users: [creatorId], currency }],
        { session: mongoSession }
      );

      // 2. Create RoomBook
      const [book] = await RoomBook.create(
        [{ roomId: room._id, tickets: [] }],
        { session: mongoSession }
      );

      // 3. Link book to room
      room.bookId = book._id;
      await room.save({ session: mongoSession });

      // 4. Create RoomStats for creator (no other members yet)
      await initBalancesForNewMember(mongoSession, room._id.toString(), session.user.id, []);

      // 5. Add room to creator's rooms array
      await User.updateOne(
        { _id: creatorId },
        { $addToSet: { rooms: room._id } },
        { session: mongoSession }
      );

      await mongoSession.commitTransaction();
      mongoSession.endSession();

      return NextResponse.json({ room, book }, { status: 201 });
    } catch (txErr) {
      await mongoSession.abortTransaction();
      mongoSession.endSession();
      throw txErr;
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** GET /api/rooms — List all rooms the current user belongs to */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const user = await User.findById(session.user.id).lean();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const rooms = await Room.find({ _id: { $in: user.rooms } })
      .populate("users", "name email image")
      .lean();

    // Attach the current user's net balance for each room
    const stats = await RoomStats.find({
      roomId: { $in: rooms.map((r) => r._id) },
      userId: session.user.id,
    }).lean();

    const statsMap = new Map(stats.map((s) => [s.roomId.toString(), s]));

    const enriched = rooms.map((room) => {
      const roomStats = statsMap.get(room._id.toString());
      const netBalance = roomStats
        ? roomStats.balances.reduce((sum: number, b: any) => sum + b.amount, 0)
        : 0;
      return { ...room, netBalance };
    });

    return NextResponse.json(enriched);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
