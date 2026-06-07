import { StoreName, RoomKeyCacheRecord } from "./stores";
import { getRecord, putRecord, deleteRecord, getAllRecords, clearStore } from "./db";

/**
 * Cache an encrypted room key for a user.
 */
export async function cacheRoomKey(
  roomId: string,
  userId: string,
  encryptedRoomKey: string,
  keyVersion: number,
): Promise<void> {
  await putRecord<RoomKeyCacheRecord>(StoreName.RoomKeyCache, {
    roomId,
    userId,
    encryptedRoomKey,
    keyVersion,
    cachedAt: Date.now(),
  });
}

/**
 * Get a cached room key by roomId.
 */
export async function getCachedRoomKey(
  roomId: string,
): Promise<RoomKeyCacheRecord | undefined> {
  return getRecord<RoomKeyCacheRecord>(StoreName.RoomKeyCache, roomId);
}

/**
 * Remove a specific room key from cache.
 */
export async function removeCachedRoomKey(roomId: string): Promise<void> {
  await deleteRecord(StoreName.RoomKeyCache, roomId);
}

/**
 * Get all cached room keys for a user (for hydration).
 */
export async function getAllCachedRoomKeys(): Promise<RoomKeyCacheRecord[]> {
  return getAllRecords<RoomKeyCacheRecord>(StoreName.RoomKeyCache);
}

/**
 * Clear all room key cache entries.
 */
export async function clearRoomKeyCache(): Promise<void> {
  await clearStore(StoreName.RoomKeyCache);
}
