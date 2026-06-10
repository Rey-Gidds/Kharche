import { auth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import Room from "@/models/Room";
import RoomBook from "@/models/RoomBook";
import RoomTicket from "@/models/RoomTicket";
import { requireActiveMembership } from "@/lib/rooms/membershipGuard";
import { updateBalances } from "@/lib/rooms/balanceEngine";
import { toSmallestUnit } from "@/utils/roomCurrency";
import mongoose from "mongoose";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * POST /api/rooms/[roomId]/settle
 * Records a settlement: current user (payer/creatorId) pays `receiverId` (bearerId) `amount`.
 * Settlement title is always plaintext "Settlement" — not sensitive.
 *
 * Body: { receiverId: string, amount: number, encryptedTitle: string, encryptedDescription?: string, keyVersion: number }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const session = await getSession(await headers());
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { roomId } = await params;
    const { receiverId, amount, encryptedTitle, encryptedDescription, keyVersion } = await req.json();

    if (!receiverId) return NextResponse.json({ error: "receiverId is required" }, { status: 400 });
    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Settlement amount must be positive" }, { status: 400 });
    }
    if (receiverId === session.user.id) {
      return NextResponse.json({ error: "Cannot settle with yourself" }, { status: 400 });
    }

    await connectDB();

    // ACTIVE membership required
    try {
      await requireActiveMembership(roomId, session.user.id);
    } catch {
      return NextResponse.json({ error: "Active membership required" }, { status: 403 });
    }

    const room = await Room.findById(roomId).lean();
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const roomUserIds = room.users.map((u: any) => u.toString());
    if (!roomUserIds.includes(receiverId)) {
      return NextResponse.json({ error: "Receiver is not a member of this room" }, { status: 400 });
    }

    const settleAmountSmallest = toSmallestUnit(Number(amount), room.currency);

    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      const payerId = session.user.id;

      // Settlement titles are always plaintext "Settlement" — not encrypted
      const ticketData: Record<string, any> = {
        roomId,
        bookId: room.bookId,
        creatorId: payerId,
        bearerId: receiverId,
        type: "settlement",
        totalAmount: settleAmountSmallest,
        splitType: "settlement",
        distribution: [],
        involvedUsers: [payerId, receiverId],
        encryptedTitle: encryptedTitle ?? "Settlement",
        encryptedDescription: encryptedDescription ?? "",
        keyVersion: keyVersion ?? room.activeKeyVersion,
      };

      const [ticket] = await RoomTicket.create(
        [ticketData],
        { session: mongoSession }
      );

      // Add to RoomBook
      await RoomBook.updateOne(
        { _id: room.bookId },
        { $push: { tickets: ticket._id } },
        { session: mongoSession }
      );

      // Update balances
      await updateBalances(mongoSession, roomId, payerId, receiverId, -settleAmountSmallest);

      await mongoSession.commitTransaction();
      mongoSession.endSession();

      return NextResponse.json({ message: "Settlement recorded successfully.", ticket });
    } catch (txErr) {
      await mongoSession.abortTransaction();
      mongoSession.endSession();
      throw txErr;
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
