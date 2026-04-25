import mongoose from "mongoose";
import RoomStats from "@/models/RoomStats";

/**
 * Core balance update engine.
 * Atomically updates both users' RoomStats within the provided transaction session.
 *
 * Semantics:
 *   fromUser → toUser:  += amount   (positive = fromUser owes toUser more)
 *   toUser   → fromUser: -= amount  (mirror)
 *
 * For normal expense (user U owes payer P their share):
 *   updateBalances(session, roomId, U, P, +share)
 *
 * For settlement (creatorId B pays bearerId A, settleAmount):
 *   updateBalances(session, roomId, B, A, -settleAmount)
 *   → B→A decreases (B owes A less), A→B increases (moves toward 0)
 */
export async function updateBalances(
  session: mongoose.ClientSession,
  roomId: string,
  fromUserId: string,
  toUserId: string,
  amount: number
): Promise<void> {
  // Update fromUser's balance towards toUser
  await RoomStats.updateOne(
    { roomId, userId: fromUserId, "balances.userId": toUserId },
    { $inc: { "balances.$.amount": amount } },
    { session }
  );

  // Update toUser's balance towards fromUser (mirror)
  await RoomStats.updateOne(
    { roomId, userId: toUserId, "balances.userId": fromUserId },
    { $inc: { "balances.$.amount": -amount } },
    { session }
  );
}

/**
 * Initialize balance entries for a new member joining an existing room.
 * Adds zero-balance entries in both directions for all existing member pairs.
 *
 * Must be called inside a transaction session.
 */
export async function initBalancesForNewMember(
  session: mongoose.ClientSession,
  roomId: string,
  newUserId: string,
  existingUserIds: string[]
): Promise<void> {
  if (existingUserIds.length === 0) {
    // First member in room — create empty stats document
    await RoomStats.create(
      [{ roomId, userId: newUserId, balances: [] }],
      { session }
    );
    return;
  }

  // Create stats doc for new user with zero balances towards all existing members
  await RoomStats.create(
    [
      {
        roomId,
        userId: newUserId,
        balances: existingUserIds.map((uid) => ({ userId: uid, amount: 0 })),
      },
    ],
    { session }
  );

  // Push a zero-balance entry into each existing member's stats doc towards new user
  await RoomStats.updateMany(
    { roomId, userId: { $in: existingUserIds } },
    { $push: { balances: { userId: newUserId, amount: 0 } } },
    { session }
  );
}
