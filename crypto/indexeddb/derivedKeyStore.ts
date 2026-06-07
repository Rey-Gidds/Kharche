import { StoreName, DerivedKeyCacheRecord } from "./stores";
import { getRecord, putRecord, deleteRecord, clearStore } from "./db";

/**
 * Cache the raw derived keys so they can be re-imported without the passphrase.
 */
export async function cacheDerivedKeys(
  userId: string,
  masterKeyRaw: string,
  privateKeyJwk: string,
): Promise<void> {
  await putRecord<DerivedKeyCacheRecord>(StoreName.DerivedKeyCache, {
    userId,
    masterKeyRaw,
    privateKeyJwk,
    cachedAt: Date.now(),
  });
}

/**
 * Retrieve the cached derived keys.
 */
export async function getDerivedKeys(
  userId: string,
): Promise<DerivedKeyCacheRecord | undefined> {
  return getRecord<DerivedKeyCacheRecord>(StoreName.DerivedKeyCache, userId);
}

/**
 * Remove the derived keys for a user (on lock or TTL expiry).
 */
export async function removeDerivedKeys(userId: string): Promise<void> {
  await deleteRecord(StoreName.DerivedKeyCache, userId);
}

/**
 * Clear all derived key cache entries (on logout).
 */
export async function clearDerivedKeys(): Promise<void> {
  await clearStore(StoreName.DerivedKeyCache);
}
