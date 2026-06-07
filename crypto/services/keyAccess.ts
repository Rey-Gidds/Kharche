/**
 * Helper to fetch the user's own public key (used by the hook on startup).
 */
export async function getPublicKey(): Promise<string | null> {
  try {
    const res = await fetch("/api/user/encryption/keys");
    if (!res.ok) return null;
    const data = await res.json();
    return data.publicKey ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch another user's public key for room key distribution.
 * This is a convenience — the actual endpoint will be added in Phase 5.
 */
export async function getUserPublicKey(userId: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/user/${userId}/public-key`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.publicKey ?? null;
  } catch {
    return null;
  }
}
