import { auth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import Room from "@/models/Room";
import RoomBook from "@/models/RoomBook";
import RoomTicket from "@/models/RoomTicket";
import { requireActiveMembership } from "@/lib/rooms/membershipGuard";
import { updateBalances } from "@/lib/rooms/balanceEngine";
import { calculateSplit, validateSplitInput, SplitType } from "@/lib/rooms/splitCalculator";
import { toSmallestUnit } from "@/utils/roomCurrency";
import mongoose from "mongoose";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/** PUT /api/rooms/[roomId]/tickets/[ticketId] — Edit an expense ticket */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ roomId: string; ticketId: string }> }
) {
  const session = await getSession(await headers());
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { roomId, ticketId } = await params;
    const body = await req.json();
    const { totalAmount, splitType, involvedUsers, splitData, creatorId, encryptedTitle, encryptedDescription, title, description } = body;

    await connectDB();

    // ACTIVE membership required
    try {
      await requireActiveMembership(roomId, session.user.id);
    } catch {
      return NextResponse.json({ error: "Active membership required" }, { status: 403 });
    }


    const room = await Room.findById(roomId).lean();
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    // When room has encryption, require encrypted title; otherwise accept plain text
    if (room.activeKeyVersion > 0) {
      if (!encryptedTitle) return NextResponse.json({ error: "Encrypted title is required" }, { status: 400 });
    } else {
      if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const roomUserIds = room.users.map((u: any) => u.toString());

    const ticket = await RoomTicket.findOne({ _id: ticketId, roomId });
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    if (ticket.type === "settlement") {
      return NextResponse.json({ error: "Settlement tickets cannot be edited" }, { status: 400 });
    }
    if (ticket.creatorId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Only the creator can edit this ticket" }, { status: 403 });
    }

    // Validate new involved users
    for (const uid of involvedUsers) {
      if (!roomUserIds.includes(uid)) {
        return NextResponse.json({ error: `User ${uid} is not a member of this room` }, { status: 400 });
      }
    }

    const payerId = creatorId || ticket.creatorId.toString();
    const totalSmallest = toSmallestUnit(Number(totalAmount), room.currency);

    let convertedSplitData = splitData;
    if (splitType === "manual" && splitData) {
      convertedSplitData = Object.fromEntries(
        Object.entries(splitData).map(([k, v]) => [k, toSmallestUnit(Number(v), room.currency)])
      );
    }

    validateSplitInput(
      { splitType: splitType as SplitType, totalAmount: totalSmallest, involvedUsers, splitData: convertedSplitData },
      roomUserIds
    );
    const newDistribution = calculateSplit({
      splitType: splitType as SplitType,
      totalAmount: totalSmallest,
      involvedUsers,
      splitData: convertedSplitData,
    });

    if (!newDistribution.some((d) => d.userId === payerId)) {
      newDistribution.push({ userId: payerId, amount: 0 });
      if (!involvedUsers.includes(payerId)) {
        involvedUsers.push(payerId);
      }
    }

    const oldPayerId = ticket.creatorId.toString();
    const oldDistSorted = [...ticket.distribution].sort((a, b) => a.userId.toString().localeCompare(b.userId.toString()));
    const newDistSorted = [...newDistribution].sort((a, b) => a.userId.localeCompare(b.userId));
    
    let needsRecomputation = oldPayerId !== payerId || oldDistSorted.length !== newDistSorted.length;
    if (!needsRecomputation) {
      for (let i = 0; i < oldDistSorted.length; i++) {
        if (oldDistSorted[i].userId.toString() !== newDistSorted[i].userId || oldDistSorted[i].amount !== newDistSorted[i].amount) {
          needsRecomputation = true;
          break;
        }
      }
    }

    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      if (needsRecomputation) {
        // Step 1: Reverse OLD distribution effects
        for (const entry of ticket.distribution) {
          const uid = entry.userId.toString();
          if (uid === oldPayerId) continue;
          await updateBalances(mongoSession, roomId, uid, oldPayerId, -entry.amount);
        }

        // Step 2: Apply NEW distribution
        for (const entry of newDistribution) {
          if (entry.userId === payerId) continue;
          await updateBalances(mongoSession, roomId, entry.userId, payerId, entry.amount);
        }
      }

      // Step 3: Update ticket — use encrypted or plain text based on room config
      ticket.encryptedTitle = encryptedTitle || title || "";
      ticket.encryptedDescription = encryptedDescription ?? (description ?? "");
      ticket.totalAmount = totalSmallest;
      ticket.splitType = splitType;
      ticket.distribution = newDistribution.map((e) => ({
        userId: new mongoose.Types.ObjectId(e.userId),
        amount: e.amount,
      }));
      ticket.involvedUsers = involvedUsers.map((u: string) => new mongoose.Types.ObjectId(u));
      ticket.creatorId = new mongoose.Types.ObjectId(payerId);
      await ticket.save({ session: mongoSession });

      await mongoSession.commitTransaction();
      mongoSession.endSession();

      const populated = await RoomTicket.findById(ticketId)
        .populate("creatorId", "name image")
        .populate("distribution.userId", "name image")
        .populate("involvedUsers", "name image")
        .lean();

      return NextResponse.json(populated);
    } catch (txErr) {
      await mongoSession.abortTransaction();
      mongoSession.endSession();
      throw txErr;
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** DELETE /api/rooms/[roomId]/tickets/[ticketId] — Delete a ticket and reverse all effects */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ roomId: string; ticketId: string }> }
) {
  const session = await getSession(await headers());
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { roomId, ticketId } = await params;
    await connectDB();

    // ACTIVE membership required
    try {
      await requireActiveMembership(roomId, session.user.id);
    } catch {
      return NextResponse.json({ error: "Active membership required" }, { status: 403 });
    }

    const room = await Room.findById(roomId).lean();
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const ticket = await RoomTicket.findOne({ _id: ticketId, roomId });
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    if (ticket.creatorId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Only the creator can delete this ticket" }, { status: 403 });
    }

    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      if (ticket.type === "expense") {
        // Reverse all balance effects
        const payerId = ticket.creatorId.toString();
        for (const entry of ticket.distribution) {
          const uid = entry.userId.toString();
          if (uid === payerId) continue;
          await updateBalances(mongoSession, roomId, uid, payerId, -entry.amount);
        }
      } else {
        // Settlement reversal: creator → bearer
        const creatorId = ticket.creatorId.toString();
        const bearerId = ticket.bearerId!.toString();
        await updateBalances(mongoSession, roomId, creatorId, bearerId, ticket.totalAmount);
      }

      // Remove ticket from RoomBook
      await RoomBook.updateOne(
        { _id: ticket.bookId },
        { $pull: { tickets: ticket._id } },
        { session: mongoSession }
      );

      // Delete ticket
      await RoomTicket.deleteOne({ _id: ticketId }, { session: mongoSession });

      await mongoSession.commitTransaction();
      mongoSession.endSession();

      return NextResponse.json({ message: "Ticket deleted and balances reversed." });
    } catch (txErr) {
      await mongoSession.abortTransaction();
      mongoSession.endSession();
      throw txErr;
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
