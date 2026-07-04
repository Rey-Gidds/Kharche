import {
  cacheMasterKey,
  getCachedMasterKey,
  removeCachedMasterKey,
  clearMasterKeyCache,
} from "./masterKeyStore";
import {
  cachePrivateKey,
  getCachedPrivateKey,
  removeCachedPrivateKey,
  clearPrivateKeyCache,
} from "./privateKeyStore";
import {
  cacheRoomKey,
  getCachedRoomKey,
  removeCachedRoomKey,
  getAllCachedRoomKeys,
  clearRoomKeyCache,
} from "./roomKeyStore";
import {
  cacheDerivedKeys,
  getDerivedKeys,
  removeDerivedKeys,
  clearDerivedKeys,
} from "./derivedKeyStore";
import { exportAesKeyRaw, importAesKeyRaw, exportKeyToJwk, importKeyFromJwk } from "../utils/keySerializer";
import { bufferToBase64url, base64urlToBuffer } from "../utils/encoding";
import { UnlockedKeys } from "../services/orchestrator";
import { unlockWithPassphrase as deriveUnlockedKeys } from "../services/orchestrator";

const ROOM_KEY_CACHE_TTL = 24 * 60 * 60 * 1000;   // 24 hours

const BROADCAST_CHANNEL_NAME = "kharche-encryption-sync";

export type SyncEventType = "lock" | "unlock" | "room-key-update";

export interface SyncEvent {
  type: SyncEventType;
  userId?: string;
  roomId?: string;
  timestamp: number;
}

/**
 * Listeners notified when the master key becomes available (unlock/auto-unlock).
 */
type UnlockListener = () => void;
const unlockListeners = new Set<UnlockListener>();

export function onMasterKeyReady(listener: UnlockListener): () => void {
  unlockListeners.add(listener);
  return () => { unlockListeners.delete(listener); };
}

function notifyMasterKeyReady() {
  unlockListeners.forEach(fn => fn());
}

/**
 * In-memory store for unlocked CryptoKey objects.
 * These keys are never persisted to disk in raw form — only encrypted blobs
 * go to IndexedDB. Raw keys live here in memory.
 */
let inMemoryMasterKey: CryptoKey | null = null;
let inMemoryPrivateKey: CryptoKey | null = null;
let cachedUserId: string | null = null;

/** BroadcastChannel for multi-tab synchronization. */
let broadcastChannel: BroadcastChannel | null = null;

function getBroadcastChannel(): BroadcastChannel {
  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  }
  return broadcastChannel;
}

/**
 * Check if a cached record is stale.
 */
function isStale(cachedAt: number, ttl: number): boolean {
  return Date.now() - cachedAt > ttl;
}

// ─── Session Lifecycle ─────────────────────────────────────────────

/**
 * Unlock and cache all keys — both in memory and IndexedDB.
 *
 * Call this after the user enters their passphrase.
 */
export async function unlockKeys(
  userId: string,
  passphrase: string,
  encryptedMasterKeyJson: string,
  encryptedPrivateKeyJson: string,
  salt: string,
): Promise<UnlockedKeys> {
  const keys = await deriveUnlockedKeys(
    passphrase,
    salt,
    encryptedMasterKeyJson,
    encryptedPrivateKeyJson,
  );

  // Warm memory
  inMemoryMasterKey = keys.masterKey;
  inMemoryPrivateKey = keys.privateKey;
  cachedUserId = userId;
  notifyMasterKeyReady();

  // Persist encrypted blobs to IndexedDB for fast rehydration
  await cacheMasterKey(userId, encryptedMasterKeyJson, salt);
  await cachePrivateKey(userId, encryptedPrivateKeyJson);

  // Notify other tabs
  getBroadcastChannel().postMessage({
    type: "unlock",
    userId,
    timestamp: Date.now(),
  } satisfies SyncEvent);

  return keys;
}

/**
 * Lock — clear all keys from memory and IndexedDB.
 */
export async function lockKeys(): Promise<void> {
  inMemoryMasterKey = null;
  inMemoryPrivateKey = null;

  if (cachedUserId) {
    await Promise.all([
      removeCachedMasterKey(cachedUserId),
      removeCachedPrivateKey(cachedUserId),
      removeDerivedKeys(cachedUserId),
    ]);
    getBroadcastChannel().postMessage({
      type: "lock",
      userId: cachedUserId,
      timestamp: Date.now(),
    } satisfies SyncEvent);
  }

  cachedUserId = null;
}

/**
 * Get the in-memory master key.
 */
export function getMasterKey(): CryptoKey | null {
  return inMemoryMasterKey;
}

/**
 * Get the in-memory private key.
 */
export function getPrivateKey(): CryptoKey | null {
  return inMemoryPrivateKey;
}

/**
 * Get the cached user ID.
 */
export function getCachedUserId(): string | null {
  return cachedUserId;
}

/**
 * Set the in-memory keys directly (used after passphrase-free rehydration).
 */
export function setInMemoryKeys(
  masterKey: CryptoKey,
  privateKey: CryptoKey,
  userId: string,
): void {
  inMemoryMasterKey = masterKey;
  inMemoryPrivateKey = privateKey;
  cachedUserId = userId;
  notifyMasterKeyReady();
}

// ─── Derived Key Cache (Auto-Unlock) ──────────────────────────────

/**
 * Export and store derived keys in IndexedDB for auto-unlock on next load.
 * Called after every successful passphrase unlock.
 */
export async function storeDerivedKeys(
  userId: string,
  masterKey: CryptoKey,
  privateKey: CryptoKey,
): Promise<void> {
  const masterKeyRaw = await exportAesKeyRaw(masterKey);
  const masterKeyRawB64 = bufferToBase64url(new Uint8Array(masterKeyRaw));

  const privateKeyJwk = await exportKeyToJwk(privateKey);
  const privateKeyJwkJson = JSON.stringify(privateKeyJwk);

  await cacheDerivedKeys(userId, masterKeyRawB64, privateKeyJwkJson);
}

/**
 * Try to auto-unlock from cached derived keys.
 * Checks TTL and re-imports CryptoKey objects.
 * Returns the unlocked keys if successful, null if expired/missing.
 *
 * On success, populates the in-memory store as a side-effect.
 */
export async function tryAutoUnlock(userId: string): Promise<UnlockedKeys | null> {
  const record = await getDerivedKeys(userId);
  if (!record) return null;

  try {
    const masterKeyRawBytes = base64urlToBuffer(record.masterKeyRaw);
    const masterKey = await importAesKeyRaw(masterKeyRawBytes, true);

    const privateKeyJwk: JsonWebKey = JSON.parse(record.privateKeyJwk);
    const privateKey = await importKeyFromJwk(
      privateKeyJwk,
      { name: "RSA-OAEP", hash: "SHA-256" },
      ["decrypt"],
    );

    setInMemoryKeys(masterKey, privateKey, userId);

    // Notify self (setInMemoryKeys already calls notifyMasterKeyReady)
    // Notify other tabs about the unlock
    getBroadcastChannel().postMessage({
      type: "unlock",
      userId,
      timestamp: Date.now(),
    } satisfies SyncEvent);

    return { masterKey, privateKey };
  } catch {
    await removeDerivedKeys(userId);
    return null;
  }
}

// ─── Room Key Cache ────────────────────────────────────────────────

/**
 * Get a room key from memory or IndexedDB.
 * Returns the encrypted blob (the user's private key is needed to decrypt it).
 */
export async function getRoomKeyEncrypted(roomId: string): Promise<{
  encryptedRoomKey: string;
  keyVersion: number;
} | null> {
  const cached = await getCachedRoomKey(roomId);

  if (cached && !isStale(cached.cachedAt, ROOM_KEY_CACHE_TTL)) {
    return {
      encryptedRoomKey: cached.encryptedRoomKey,
      keyVersion: cached.keyVersion,
    };
  }

  if (cached && isStale(cached.cachedAt, ROOM_KEY_CACHE_TTL)) {
    await removeCachedRoomKey(roomId);
  }

  return null;
}

/**
 * Cache a room key (encrypted blob).
 */
export async function setRoomKeyEncrypted(
  roomId: string,
  userId: string,
  encryptedRoomKey: string,
  keyVersion: number,
): Promise<void> {
  await cacheRoomKey(roomId, userId, encryptedRoomKey, keyVersion);

  getBroadcastChannel().postMessage({
    type: "room-key-update",
    userId,
    roomId,
    timestamp: Date.now(),
  } satisfies SyncEvent);
}

/**
 * Get a room key decrypted to a usable CryptoKey.
 * Fetches from IndexedDB cache first, decrypts with the in-memory private key.
 *
 * @returns The room key as an AES-GCM CryptoKey, or null if unable to decrypt.
 */
export async function getRoomKeyDecrypted(roomId: string): Promise<CryptoKey | null> {
  if (!inMemoryPrivateKey) return null;

  const encrypted = await getRoomKeyEncrypted(roomId);
  if (!encrypted) return null;

  try {
    const { decryptRoomKey } = await import("../services/roomKey.service");
    return await decryptRoomKey(encrypted.encryptedRoomKey, inMemoryPrivateKey);
  } catch {
    return null;
  }
}

// ─── Startup Hydration ─────────────────────────────────────────────

export interface HydrationResult {
  /** Whether we found and validated cached key material */
  hydrated: boolean;
  userId: string | null;
  /** The cached encrypted key blobs (user still needs to enter passphrase to unlock) */
  encryptedMasterKey: string | null;
  encryptedPrivateKey: string | null;
  salt: string | null;
}

/**
 * Attempt to hydrate keys from IndexedDB at startup.
 *
 * This detects whether the user has previously unlocked (meaning encrypted
 * blobs are cached locally). It does NOT auto-unlock — the user still needs
 * their passphrase. But it avoids an extra network call to fetch the blobs.
 */
export async function hydrateFromCache(userId: string): Promise<HydrationResult> {
  const masterKeyRecord = await getCachedMasterKey(userId);
  const privateKeyRecord = await getCachedPrivateKey(userId);

  if (!masterKeyRecord || !privateKeyRecord) {
    return {
      hydrated: false,
      userId: null,
      encryptedMasterKey: null,
      encryptedPrivateKey: null,
      salt: null,
    };
  }

  return {
    hydrated: true,
    userId,
    encryptedMasterKey: masterKeyRecord.encryptedMasterKey,
    encryptedPrivateKey: privateKeyRecord.encryptedPrivateKey,
    salt: masterKeyRecord.salt,
  };
}

// ─── Logout Cleanup ────────────────────────────────────────────────

/**
 * Full cleanup — clears memory and all IndexedDB key stores.
 * Call on explicit logout.
 */
export async function logoutCleanup(): Promise<void> {
  inMemoryMasterKey = null;
  inMemoryPrivateKey = null;
  cachedUserId = null;

  await Promise.all([
    clearMasterKeyCache(),
    clearPrivateKeyCache(),
    clearRoomKeyCache(),
    clearDerivedKeys(),
  ]);

  getBroadcastChannel().postMessage({
    type: "lock",
    userId: cachedUserId ?? undefined,
    timestamp: Date.now(),
  } satisfies SyncEvent);
}

// ─── Multi-Tab Synchronization ─────────────────────────────────────

type SyncListener = (event: SyncEvent) => void;
const syncListeners = new Set<SyncListener>();

/**
 * Listen for encryption state changes from other tabs.
 * Returns an unsubscribe function.
 */
export function onSyncEvent(listener: SyncListener): () => void {
  syncListeners.add(listener);

  const channel = getBroadcastChannel();
  const handler = (event: MessageEvent<SyncEvent>) => {
    // Don't process our own messages
    if (event.data.timestamp === Date.now()) return;
    listener(event.data);
  };

  channel.addEventListener("message", handler);

  return () => {
    syncListeners.delete(listener);
    channel.removeEventListener("message", handler);
  };
}
