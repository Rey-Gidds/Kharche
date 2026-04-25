import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Room from "@/models/Room";
import RoomBook from "@/models/RoomBook";
import RoomTicket from "@/models/RoomTicket";
import { updateBalances } from "@/lib/rooms/balanceEngine";
import { calculateSplit, validateSplitInput, SplitType } from "@/lib/rooms/splitCalculator";
import { toSmallestUnit } from "@/utils/roomCurrency";
import mongoose from "mongoose";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/** GET /api/rooms/[roomId]/tickets */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { roomId } = await params;
    await connectDB();

    const room = await Room.findById(roomId).lean();
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const isMember = room.users.some((u: any) => u.toString() === session.user.id);
    if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const tickets = await RoomTicket.find({ roomId })
      .populate("creatorId", "name image")
      .populate("bearerId", "name image")
      .populate("distribution.userId", "name image")
      .populate("involvedUsers", "name image")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(tickets);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** POST /api/rooms/[roomId]/tickets — Create an expense ticket */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { roomId } = await params;
    const body = await req.json();
    const { title, description, totalAmount, splitType, creatorId, involvedUsers, splitData } = body;

    // Basic validation
    if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
    if (!totalAmount || totalAmount <= 0) return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
    if (!splitType) return NextResponse.json({ error: "splitType is required" }, { status: 400 });
    if (!involvedUsers?.length) return NextResponse.json({ error: "At least one involved user is required" }, { status: 400 });

    await connectDB();

    const room = await Room.findById(roomId).lean();
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const roomUserIds = room.users.map((u: any) => u.toString());
    const isMember = roomUserIds.includes(session.user.id);
    if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Validate payer is in room
    const payerId = creatorId || session.user.id;
    if (!roomUserIds.includes(payerId)) {
      return NextResponse.json({ error: "Payer is not a member of this room" }, { status: 400 });
    }

    // Validate involved users
    for (const uid of involvedUsers) {
      if (!roomUserIds.includes(uid)) {
        return NextResponse.json({ error: `User ${uid} is not a member of this room` }, { status: 400 });
      }
    }
    const uniqueInvolved = new Set(involvedUsers);
    if (uniqueInvolved.size !== involvedUsers.length) {
      return NextResponse.json({ error: "Duplicate users in involvedUsers" }, { status: 400 });
    }

    // Convert totalAmount to smallest unit
    const totalSmallest = toSmallestUnit(Number(totalAmount), room.currency);

    // Convert manual splitData amounts if present
    let convertedSplitData = splitData;
    if (splitType === "manual" && splitData) {
      convertedSplitData = Object.fromEntries(
        Object.entries(splitData).map(([k, v]) => [k, toSmallestUnit(Number(v), room.currency)])
      );
    }

    // Calculate distribution
    validateSplitInput(
      { splitType: splitType as SplitType, totalAmount: totalSmallest, involvedUsers, splitData: convertedSplitData },
      roomUserIds
    );
    const distribution = calculateSplit({
      splitType: splitType as SplitType,
      totalAmount: totalSmallest,
      involvedUsers,
      splitData: convertedSplitData,
    });

    // Ensure payer is always in the distribution (amount 0 if not previously selected)
    // so they are visible as the ticket creator/payer in balances
    if (!distribution.some((d) => d.userId === payerId)) {
      distribution.push({ userId: payerId, amount: 0 });
      if (!involvedUsers.includes(payerId)) {
        involvedUsers.push(payerId);
      }
    }

    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      // Create ticket
      const [ticket] = await RoomTicket.create(
        [
          {
            roomId,
            bookId: room.bookId,
            creatorId: payerId,
            type: "expense",
            title: title.trim(),
            description: description?.trim(),
            totalAmount: totalSmallest,
            splitType,
            distribution: distribution.map((e) => ({ userId: e.userId, amount: e.amount })),
            involvedUsers,
          },
        ],
        { session: mongoSession }
      );

      // Add ticket to RoomBook
      await RoomBook.updateOne(
        { _id: room.bookId },
        { $push: { tickets: ticket._id } },
        { session: mongoSession }
      );

      // Update balances: for each user in distribution except the payer
      for (const entry of distribution) {
        if (entry.userId === payerId) continue; // payer absorbs their own share
        await updateBalances(mongoSession, roomId, entry.userId, payerId, entry.amount);
      }

      await mongoSession.commitTransaction();
      mongoSession.endSession();

      const populated = await RoomTicket.findById(ticket._id)
        .populate("creatorId", "name image")
        .populate("distribution.userId", "name image")
        .populate("involvedUsers", "name image")
        .lean();

      return NextResponse.json(populated, { status: 201 });
    } catch (txErr) {
      await mongoSession.abortTransaction();
      mongoSession.endSession();
      throw txErr;
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
