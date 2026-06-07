import { bufferToBase64url, base64urlToBuffer } from "../utils/encoding";
import { importAesKeyRaw } from "../utils/keySerializer";

/**
 * Generate a cryptographically random recovery key (256-bit).
 * Returns both the raw key and its base64url-encoded string form.
 */
export async function generateRecoveryKey(): Promise<{
  key: CryptoKey;
  encoded: string;
}> {
  const rawBytes = crypto.getRandomValues(new Uint8Array(32)); // 256 bits
  const encoded = bufferToBase64url(rawBytes);
  const key = await importAesKeyRaw(rawBytes.buffer);
  return { key, encoded };
}

/**
 * Import a recovery key from its base64url-encoded string form.
 */
export async function importRecoveryKey(encoded: string): Promise<CryptoKey> {
  const raw = base64urlToBuffer(encoded);
  return importAesKeyRaw(raw);
}
