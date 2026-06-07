import { CryptoError, KeyExportError, KeyImportError } from "../errors";
import { KEY_USAGES } from "./constants";

/**
 * Export a CryptoKey to a JsonWebKey for storage/transport.
 */
export async function exportKeyToJwk(key: CryptoKey): Promise<JsonWebKey> {
  try {
    const jwk = await crypto.subtle.exportKey("jwk", key);
    return jwk;
  } catch (err) {
    throw new KeyExportError("Failed to export CryptoKey to JWK", err);
  }
}

/**
 * Import a JsonWebKey back into a usable CryptoKey.
 */
export async function importKeyFromJwk(
  jwk: JsonWebKey,
  algorithm: Algorithm | RsaHashedImportParams,
  usages: KeyUsage[],
): Promise<CryptoKey> {
  try {
    return await crypto.subtle.importKey("jwk", jwk, algorithm, false, usages);
  } catch (err) {
    throw new KeyImportError("Failed to import CryptoKey from JWK", err);
  }
}

/**
 * Export a symmetric AES key to a raw ArrayBuffer.
 */
export async function exportAesKeyRaw(key: CryptoKey): Promise<ArrayBuffer> {
  try {
    return await crypto.subtle.exportKey("raw", key);
  } catch (err) {
    throw new KeyExportError("Failed to export AES key as raw", err);
  }
}

/**
 * Import a raw ArrayBuffer as an AES key.
 */
export async function importAesKeyRaw(
  raw: ArrayBuffer,
  extractable: boolean = false,
): Promise<CryptoKey> {
  try {
    return await crypto.subtle.importKey(
      "raw",
      raw,
      { name: "AES-GCM" },
      extractable,
      KEY_USAGES.AES_GCM,
    );
  } catch (err) {
    throw new KeyImportError("Failed to import raw AES key", err);
  }
}
