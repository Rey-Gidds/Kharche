import { DEFAULT_CRYPTO_CONFIG } from "../utils/constants";
import { bufferToBase64url, base64urlToBuffer } from "../utils/encoding";
import { KeyDerivationError } from "../errors";
import { DerivedKey } from "../types";

const config = DEFAULT_CRYPTO_CONFIG;

/**
 * Derive an AES-256-GCM key from a passphrase and salt using PBKDF2.
 *
 * @param passphrase  User's passphrase
 * @param salt        Optional salt (32 bytes, base64url). Generated randomly if omitted.
 * @returns           DerivedKey containing the CryptoKey and the salt used
 */
export async function deriveKeyFromPassphrase(
  passphrase: string,
  salt?: string,
): Promise<DerivedKey> {
  const saltBytes = salt
    ? new Uint8Array(base64urlToBuffer(salt))
    : crypto.getRandomValues(new Uint8Array(config.saltLength));

  const saltString = bufferToBase64url(saltBytes);

  let baseKey: CryptoKey;
  try {
    baseKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(passphrase),
      { name: "PBKDF2" },
      false,
      ["deriveKey"],
    );
  } catch (err) {
    throw new KeyDerivationError("Failed to import passphrase for derivation", err);
  }

  let derivedKey: CryptoKey;
  try {
    derivedKey = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: saltBytes,
        iterations: config.pbkdf2Iterations,
        hash: config.pbkdf2Hash,
      },
      baseKey,
      {
        name: "AES-GCM",
        length: config.aesKeySize,
      },
      true,
      ["encrypt", "decrypt"],
    );
  } catch (err) {
    throw new KeyDerivationError("PBKDF2 key derivation failed", err);
  }

  return { key: derivedKey, salt: saltString };
}

/**
 * Derive a wrapping key (for encrypting the user's private key / master key)
 * from the given passphrase and salt. Returns the derived CryptoKey and salt.
 *
 * This is identical to deriveKeyFromPassphrase in implementation, but exists
 * as a separate semantic function so that different derivation contexts
 * can use different iteration counts or params in the future if needed.
 */
export async function deriveWrappingKey(
  passphrase: string,
  salt?: string,
): Promise<DerivedKey> {
  return deriveKeyFromPassphrase(passphrase, salt);
}
