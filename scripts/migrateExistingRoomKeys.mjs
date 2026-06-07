/**
 * Migration script for existing rooms and room key data.
 *
 * For each room with activeKeyVersion > 0:
 * 1. Create RoomMembership(ACTIVE, currentKeyVersion=activeKeyVersion) for all users in room.users
 * 2. Remove encryptedKey field from all RoomKeyVersion documents
 * 3. (RoomKeyAccess records are already valid RSA-OAEP encrypted — no change needed)
 *
 * Run: node scripts/migrateExistingRoomKeys.mjs
 */
import mongoose from "mongoose";
import { config } from "dotenv";

config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;

async function migrate() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI is required");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;

  // Step 1: For each room with activeKeyVersion > 0, create RoomMembership for users
  const rooms = await db.collection("rooms").find({ activeKeyVersion: { $gt: 0 } }).toArray();
  console.log(`Found ${rooms.length} rooms with active keys`);

  for (const room of rooms) {
    const roomId = room._id;
    const activeKeyVersion = room.activeKeyVersion;

    if (!room.users?.length) continue;

    for (const userId of room.users) {
      // Upsert RoomMembership as ACTIVE with current key version
      await db.collection("roommemberships").updateOne(
        { roomId, userId },
        {
          $set: {
            roomId,
            userId,
            status: "ACTIVE",
            currentKeyVersion: activeKeyVersion,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
    }
    console.log(`  Room ${roomId}: Created memberships for ${room.users.length} users`);
  }

  // Step 2: Remove encryptedKey field from RoomKeyVersion documents
  const keyResult = await db.collection("roomkeyversions").updateMany(
    { encryptedKey: { $exists: true } },
    { $unset: { encryptedKey: "" } }
  );
  console.log(`Removed encryptedKey from ${keyResult.modifiedCount} RoomKeyVersion documents`);

  // Step 3: Set needsBackfill on all users who have encryption setup
  const userEncryptions = await db.collection("userencryptions").find({ setupCompleted: true }).toArray();
  const userIdsWithEncryption = userEncryptions.map((ue) => ue.userId);

  if (userIdsWithEncryption.length > 0) {
    const userResult = await db.collection("user").updateMany(
      { _id: { $in: userIdsWithEncryption } },
      { $set: { needsBackfill: true } }
    );
    console.log(`Set needsBackfill=true for ${userResult.modifiedCount} users`);
  }

  console.log("Migration complete!");
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
