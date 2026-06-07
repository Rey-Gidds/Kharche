import { importKeyFromJwk } from "@/crypto/utils/keySerializer";
import { encryptRoomKeyForUser } from "@/crypto/services/roomKey.service";
import { getPrivateKey, getRoomKeyEncrypted } from "@/crypto/indexeddb/cacheManager";
import { fetchAndDecryptRoomKey } from "./roomKeyClient";

/**
 * Fetch a user's RSA public key from the server and import as CryptoKey.
 */
async function fetchPublicKeyAsCryptoKey(userId: string): Promise<CryptoKey | null> {
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
 * Distribute the current room key to a pending member.
 * Steps:
 * 1. Fetch pending member's public key
 * 2. Get the room key (from cache or server)
 * 3. Encrypt the room key for the target user
 * 4. POST the encrypted key-package to the server
 */
export async function distributeKeyToPendingMember(
  roomId: string,
  pendingUserId: string,
  keyVersion: number,
): Promise<boolean> {
  try {
    // 1. Fetch public key
    const publicKey = await fetchPublicKeyAsCryptoKey(pendingUserId);
    if (!publicKey) return false;

    // 2. Get room key
    const roomKey = await fetchAndDecryptRoomKey(roomId);
    if (!roomKey) return false;

    // 3. Encrypt for target user
    const encryptedRoomKey = await encryptRoomKeyForUser(roomKey, publicKey);

    // 4. POST key-package to server
    const res = await fetch(`/api/rooms/${roomId}/key-package`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetUserId: pendingUserId,
        encryptedRoomKey,
        keyVersion,
      }),
    });

    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch all pending members for a room (creator only).
 */
export async function fetchPendingMembers(roomId: string): Promise<any[]> {
  try {
    const res = await fetch(`/api/rooms/${roomId}/members/pending`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.members ?? [];
  } catch {
    return [];
  }
}
