import { importKeyFromJwk } from "@/crypto/utils/keySerializer";
import { decryptRoomKey, decryptRoomName } from "@/crypto/services/roomKey.service";
import { getPrivateKey, getRoomKeyEncrypted, setRoomKeyEncrypted } from "@/crypto/indexeddb/cacheManager";
import type { IRoom } from "@/models/Room";

/**
 * Fetch another user's RSA public key from the server and import it as a CryptoKey.
 */
export async function fetchPublicKey(userId: string): Promise<CryptoKey | null> {
  try {
    const res = await fetch(`/api/user/${userId}/public-key`);
    if (!res.ok) return null;
    const data = await res.json();
    const jwk = JSON.parse(data.publicKey);
    return await importKeyFromJwk(
      jwk,
      { name: "RSA-OAEP", hash: "SHA-256" },
      ["encrypt"] as KeyUsage[],
    );
  } catch {
    return null;
  }
}

/**
 * Fetch the current user's encrypted room key for a room from the server.
 * Decrypts it using the in-memory private key and caches it.
 *
 * @returns The decrypted room key as an AES-GCM CryptoKey, or null if unavailable.
 */
export async function fetchAndDecryptRoomKey(roomId: string): Promise<CryptoKey | null> {
  // First check the IndexedDB cache (already decrypted via cacheManager)
  const cached = await getRoomKeyEncrypted(roomId);
  const privateKey = getPrivateKey();
  if (!privateKey) return null;

  if (cached) {
    try {
      return await decryptRoomKey(cached.encryptedRoomKey, privateKey);
    } catch {
      // Stale cache entry, fetch from server
    }
  }

  // Fetch from server
  try {
    const res = await fetch(`/api/rooms/${roomId}/key-access`);
    if (!res.ok) return null;
    const data = await res.json();

    if (data.encryptedRoomKey) {
      // Cache the encrypted blob
      await setRoomKeyEncrypted(roomId, data.userId, data.encryptedRoomKey, data.keyVersion);
      return await decryptRoomKey(data.encryptedRoomKey, privateKey);
    }
  } catch {
    // Fall through to null
  }

  return null;
}

/**
 * Decrypt a room's name from its encryptedName.
 * Falls back to the plaintext name if no encryptedName is present.
 */
export async function getDecryptedRoomName(
  room: Pick<IRoom, "name" | "encryptedName" | "activeKeyVersion">,
  roomKey?: CryptoKey,
): Promise<string> {
  if (!room.encryptedName) return room.name;
  if (!roomKey) return room.name;

  try {
    return await decryptRoomName(room.encryptedName, roomKey);
  } catch {
    return room.name;
  }
}
