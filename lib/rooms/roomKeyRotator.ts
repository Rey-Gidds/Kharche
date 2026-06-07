import { generateRoomKey, encryptRoomKeyForUser } from "@/crypto/services/roomKey.service";
import { fetchAndDecryptRoomKey } from "./roomKeyClient";
import { importKeyFromJwk } from "@/crypto/utils/keySerializer";
import { getRoomKeyEncrypted, setRoomKeyEncrypted } from "@/crypto/indexeddb/cacheManager";

/**
 * Fetch a user's public key as a CryptoKey (public only).
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
 * Fetch remaining ACTIVE members for a room.
 */
async function fetchActiveMembers(roomId: string): Promise<{ _id: string }[]> {
  try {
    const res = await fetch(`/api/rooms/${roomId}?members=1`);
    if (!res.ok) return [];
    const data = await res.json();
    // Room.users contains all members — we need ACTIVE ones.
    // This endpoint is used post-leave, so remaining users are still in room.users
    return data.users ?? [];
  } catch {
    return [];
  }
}

/**
 * Rotate a room key when a member leaves.
 * Must be called by ONE remaining member (transaction on server side prevents duplicates).
 */
export async function rotateRoomKeyOnMemberLeft(
  roomId: string,
  currentKeyVersion: number,
  remainingUserIds: string[],
): Promise<boolean> {
  try {
    // 1. Generate new room key
    const newKey = await generateRoomKey();
    const rawKey = await crypto.subtle.exportKey("raw", newKey);

    // 2. Encrypt new key for each remaining member
    const keyPackages: { userId: string; encryptedRoomKey: string }[] = [];
    for (const userId of remainingUserIds) {
      const publicKey = await fetchPublicKeyAsCryptoKey(userId);
      if (!publicKey) continue;
      const encryptedRoomKey = await encryptRoomKeyForUser(newKey, publicKey);
      keyPackages.push({ userId, encryptedRoomKey });
    }

    if (keyPackages.length === 0) return false;

    // 3. POST new key version to server
    const newVersion = currentKeyVersion + 1;
    const res = await fetch(`/api/rooms/${roomId}/keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keyVersion: newVersion,
        keyPackages,
      }),
    });

    if (!res.ok) return false;

    // 4. Update local cache for the current user
    const me = keyPackages.find((pkg) => pkg.userId === /* current user - can't know here */ "");
    // We'll let the ROOM_KEY_ROTATED SSE handler update the cache
    // Or just re-fetch on next use

    return true;
  } catch {
    return false;
  }
}
