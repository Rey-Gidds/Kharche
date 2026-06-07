import { NextResponse } from "next/server";
import { getCachedSession } from "@/lib/cachedSession";
import { headers } from "next/headers";
import Expense from "@/models/Expense";
import ExpenseBook from "@/models/ExpenseBook";
import Room from "@/models/Room";
import RoomTicket from "@/models/RoomTicket";
import { User } from "@/models/User";
import connectDB from "@/lib/db";

/**
 * POST /api/user/backfill
 * Batch-update encrypted fields and clear plaintext. Idempotent.
 * Body: { expenses?, expenseBooks?, rooms?, roomTickets? }
 */
export async function POST(req: Request) {
  const session = await getCachedSession(await headers());
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    await connectDB();

    let processed = { expenses: 0, books: 0, rooms: 0, tickets: 0 };

    // Backfill expenses
    if (body.expenses?.length) {
      for (const item of body.expenses) {
        const result = await Expense.updateOne(
          { _id: item._id, userId: session.user.id, encryptedDescription: { $exists: false } },
          {
            $set: {
              encryptedDescription: item.encryptedDescription,
              encryptionVersion: item.encryptionVersion ?? 1,
            },
            $unset: { description: "" },
          }
        );
        if (result.modifiedCount > 0) processed.expenses++;
      }
    }

    // Backfill expense books
    if (body.expenseBooks?.length) {
      for (const item of body.expenseBooks) {
        const result = await ExpenseBook.updateOne(
          { _id: item._id, userId: session.user.id, encryptedTitle: { $exists: false } },
          {
            $set: {
              encryptedTitle: item.encryptedTitle,
              encryptedDescription: item.encryptedDescription,
              encryptionVersion: item.encryptionVersion ?? 1,
            },
            $unset: { title: "", description: "" },
          }
        );
        if (result.modifiedCount > 0) processed.books++;
      }
    }

    // Backfill rooms
    if (body.rooms?.length) {
      for (const item of body.rooms) {
        const result = await Room.updateOne(
          { _id: item._id, encryptedName: { $exists: false } },
          {
            $set: { encryptedName: item.encryptedName },
          }
        );
        if (result.modifiedCount > 0) processed.rooms++;
      }
    }

    // Backfill room tickets
    if (body.roomTickets?.length) {
      for (const item of body.roomTickets) {
        const result = await RoomTicket.updateOne(
          { _id: item._id, encryptedTitle: { $exists: false } },
          {
            $set: {
              encryptedTitle: item.encryptedTitle,
              encryptedDescription: item.encryptedDescription,
              keyVersion: item.keyVersion,
            },
            $unset: { title: "", description: "" },
          }
        );
        if (result.modifiedCount > 0) processed.tickets++;
      }
    }

    // Mark user backfill as complete if we processed everything in this call
    // or if there's nothing to process (no body arrays)
    const hasWork = body.expenses?.length || body.expenseBooks?.length || body.rooms?.length || body.roomTickets?.length;
    if (hasWork) {
      // Only mark complete if all items were processed
      const totalItems =
        (body.expenses?.length ?? 0) +
        (body.expenseBooks?.length ?? 0) +
        (body.rooms?.length ?? 0) +
        (body.roomTickets?.length ?? 0);
      const totalProcessed = processed.expenses + processed.books + processed.rooms + processed.tickets;

      if (totalProcessed >= totalItems) {
        await User.findByIdAndUpdate(session.user.id, { needsBackfill: false });
      }
    }

    return NextResponse.json({ processed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
