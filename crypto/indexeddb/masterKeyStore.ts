import { StoreName, MasterKeyCacheRecord } from "./stores";
import { getRecord, putRecord, deleteRecord, clearStore } from "./db";

/**
 * Cache the encrypted master key and its salt for quick unlock.
 */
export async function cacheMasterKey(
  userId: string,
  encryptedMasterKey: string,
  salt: string,
): Promise<void> {
  await putRecord<MasterKeyCacheRecord>(StoreName.MasterKeyCache, {
    userId,
    encryptedMasterKey,
    salt,
    cachedAt: Date.now(),
  });
}

/**
 * Retrieve the cached master key data.
 */
export async function getCachedMasterKey(
  userId: string,
): Promise<MasterKeyCacheRecord | undefined> {
  return getRecord<MasterKeyCacheRecord>(StoreName.MasterKeyCache, userId);
}

/**
 * Remove the cached master key (on lock-out).
 */
export async function removeCachedMasterKey(userId: string): Promise<void> {
  await deleteRecord(StoreName.MasterKeyCache, userId);
}

/**
 * Clear all master key cache entries.
 */
export async function clearMasterKeyCache(): Promise<void> {
  await clearStore(StoreName.MasterKeyCache);
}
