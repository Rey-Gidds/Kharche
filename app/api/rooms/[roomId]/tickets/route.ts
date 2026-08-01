import { auth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import Room from "@/models/Room";
import RoomBook from "@/models/RoomBook";
import RoomTicket from "@/models/RoomTicket";
import RoomMembership from "@/models/RoomMembership";
import Notification from "@/models/Notification";
import { requireActiveMembership } from "@/lib/rooms/membershipGuard";
import { updateBalances } from "@/lib/rooms/balanceEngine";
import { calculateSplit, validateSplitInput, SplitType } from "@/lib/rooms/splitCalculator";
import { toSmallestUnit } from "@/utils/roomCurrency";
import { waitUntil } from "@vercel/functions";
import mongoose from "mongoose";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/** GET /api/rooms/[roomId]/tickets */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  await connectDB();
  const session = await getSession(await headers());
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { roomId } = await params;
    const { searchParams } = new URL(req.url);

    // ACTIVE membership required
    try {
      await requireActiveMembership(roomId, session.user.id);
    } catch {
      return NextResponse.json({ error: "Active membership required" }, { status: 403 });
    }

    const dateFilterType = searchParams.get("dateFilterType") || "all";
    const dateFilterValue = searchParams.get("dateFilterValue") || "";

    // Secure pagination — allow larger limits for date-filtered aggregation queries
    const hasDateFilter = dateFilterType !== "all" && dateFilterValue !== "";
    const MAX_LIMIT = hasDateFilter ? 500 : 50;
    const DEFAULT_LIMIT = hasDateFilter ? 500 : 20;
    const rawLimit = parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? DEFAULT_LIMIT : rawLimit), MAX_LIMIT);
    const rawPage = parseInt(searchParams.get("page") ?? "1", 10);
    const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
    const skip = (page - 1) * limit;

    let query: any = { roomId };

    if (hasDateFilter) {
      if (dateFilterType === "month") {
        const [year, month] = dateFilterValue.split("-").map(Number);
        const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
        const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
        query.createdAt = { $gte: start, $lte: end };
      } else if (dateFilterType === "year") {
        const year = Number(dateFilterValue);
        const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
        const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
        query.createdAt = { $gte: start, $lte: end };
      }
    }

    const total = await RoomTicket.countDocuments(query);
    const tickets = await RoomTicket.find(query)
      .populate("creatorId", "name image")
      .populate("bearerId", "name image")
      .populate("distribution.userId", "name image")
      .populate("involvedUsers", "name image")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const hasMore = skip + tickets.length < total;
    return NextResponse.json({ data: tickets, hasMore, page, total });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** POST /api/rooms/[roomId]/tickets — Create an expense ticket */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  await connectDB();
  const session = await getSession(await headers());
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { roomId } = await params;
    const body = await req.json();
    const { totalAmount, splitType, creatorId, involvedUsers, splitData, encryptedTitle, encryptedDescription, title, description } = body;

    if (!totalAmount || totalAmount <= 0) return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
    if (!splitType) return NextResponse.json({ error: "splitType is required" }, { status: 400 });
    if (!involvedUsers?.length) return NextResponse.json({ error: "At least one involved user is required" }, { status: 400 });

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
    const distribution = calculateSplit({
      splitType: splitType as SplitType,
      totalAmount: totalSmallest,
      involvedUsers,
      splitData: convertedSplitData,
    });

    if (!distribution.some((d) => d.userId === payerId)) {
      distribution.push({ userId: payerId, amount: 0 });
      if (!involvedUsers.includes(payerId)) {
        involvedUsers.push(payerId);
      }
    }

    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      const ticketData: Record<string, any> = {
        roomId,
        bookId: room.bookId,
        creatorId: payerId,
        type: "expense",
        totalAmount: totalSmallest,
        splitType,
        distribution: distribution.map((e) => ({ userId: e.userId, amount: e.amount })),
        involvedUsers,
        encryptedTitle: encryptedTitle || title || "",
        encryptedDescription: encryptedDescription ?? (description ?? ""),
        keyVersion: room.activeKeyVersion || 0,
      };

      const [ticket] = await RoomTicket.create(
        [ticketData],
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
        if (entry.userId === payerId) continue;
        await updateBalances(mongoSession, roomId, entry.userId, payerId, entry.amount);
      }

      await mongoSession.commitTransaction();
      mongoSession.endSession();

      const populated = await RoomTicket.findById(ticket._id)
        .populate("creatorId", "name image")
        .populate("distribution.userId", "name image")
        .populate("involvedUsers", "name image")
        .lean();

      // ── Fire-and-forget push notifications ──────────────────────────────────
      // Uses waitUntil() so Vercel's serverless runtime keeps the function alive
      // until the notifications are dispatched to the push worker.
      const notifyWork = (async () => {
        try {
          // Find all ACTIVE members of the room except the ticket creator
          const memberships = await RoomMembership.find(
            { roomId, status: "ACTIVE", userId: { $ne: payerId } },
            { userId: 1 }
          ).lean();

          if (memberships.length === 0) return;

          // Determine ticket title for notifications
          // For encrypted rooms (activeKeyVersion > 0) → use generic "Expense"
          // For non-encrypted rooms → use the plain title from request body
          const notifTitle = room.activeKeyVersion > 0 ? "Expense" : (title || "Expense");

          // Build one notification doc per recipient
          const distributionMap = new Map(
            distribution.map((e: { userId: string; amount: number }) => [e.userId, e.amount])
          );

          const notifDocs = memberships.map((m) => ({
            recipientId: m.userId,
            roomId: ticket.roomId,
            ticketId: ticket._id,
            ticketTitle: notifTitle,
            roomName: room.name,
            currency: room.currency,
            amount: totalSmallest,
            recipientShare: distributionMap.get(m.userId.toString()) ?? 0,
          }));

          // Bulk insert — ignore duplicate key errors (deduplication index)
          const inserted = await Notification.insertMany(notifDocs, {
            ordered: false,
            rawResult: true,
          });

          // Collect the inserted IDs to send to the worker
          const insertedIds: string[] = [];
          if (inserted && (inserted as any).insertedIds) {
            const ids = (inserted as any).insertedIds as Record<number, mongoose.Types.ObjectId>;
            for (const id of Object.values(ids)) {
              insertedIds.push(id.toString());
            }
          }

          if (insertedIds.length === 0) return;

          // Fire-and-forget the worker — no await, catch only for logging
          const workerUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/push/worker`;
          fetch(workerUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-internal-secret": process.env.INTERNAL_WORKER_SECRET ?? "",
            },
            body: JSON.stringify({ notificationIds: insertedIds }),
          }).catch((e) => console.error("[push worker dispatch]:", e));
        } catch (notifErr) {
          console.error("[push notification setup]:", notifErr);
        }
      })();
      waitUntil(notifyWork);
      // ── End fire-and-forget ─────────────────────────────────────────────────

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
