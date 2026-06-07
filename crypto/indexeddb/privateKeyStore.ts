import { StoreName, PrivateKeyCacheRecord } from "./stores";
import { getRecord, putRecord, deleteRecord, clearStore } from "./db";

/**
 * Cache the encrypted private key for quick unlock.
 */
export async function cachePrivateKey(
  userId: string,
  encryptedPrivateKey: string,
): Promise<void> {
  await putRecord<PrivateKeyCacheRecord>(StoreName.PrivateKeyCache, {
    userId,
    encryptedPrivateKey,
    cachedAt: Date.now(),
  });
}

/**
 * Retrieve the cached private key data.
 */
export async function getCachedPrivateKey(
  userId: string,
): Promise<PrivateKeyCacheRecord | undefined> {
  return getRecord<PrivateKeyCacheRecord>(StoreName.PrivateKeyCache, userId);
}

/**
 * Remove the cached private key (on lock-out).
 */
export async function removeCachedPrivateKey(userId: string): Promise<void> {
  await deleteRecord(StoreName.PrivateKeyCache, userId);
}

/**
 * Clear all private key cache entries.
 */
export async function clearPrivateKeyCache(): Promise<void> {
  await clearStore(StoreName.PrivateKeyCache);
}
