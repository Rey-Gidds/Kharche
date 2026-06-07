import { DEFAULT_CRYPTO_CONFIG } from "../utils/constants";
import { bufferToBase64url, base64urlToBuffer } from "../utils/encoding";
import { EncryptionError, DecryptionError } from "../errors";
import { EncryptedData } from "../types";

const config = DEFAULT_CRYPTO_CONFIG;

/**
 * Encrypt plaintext using AES-256-GCM.
 *
 * @param plaintext  UTF-8 string to encrypt
 * @param key        AES-GCM CryptoKey (256-bit)
 * @returns          EncryptedData with base64url-encoded iv, ciphertext, tag
 */
export async function encryptAesGcm(
  plaintext: string,
  key: CryptoKey,
): Promise<EncryptedData> {
  const iv = crypto.getRandomValues(new Uint8Array(config.aesIvLength));
  const encoded = new TextEncoder().encode(plaintext);

  let result: ArrayBuffer;
  try {
    result = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, tagLength: config.aesTagLength },
      key,
      encoded,
    );
  } catch (err) {
    throw new EncryptionError("AES-GCM encryption failed", err);
  }

  // AES-GCM appends the auth tag to the ciphertext (last tagLength bits)
  const tagLengthBytes = config.aesTagLength / 8;
  const ciphertext = new Uint8Array(result.slice(0, result.byteLength - tagLengthBytes));
  const tag = new Uint8Array(result.slice(result.byteLength - tagLengthBytes));

  return {
    iv: bufferToBase64url(iv),
    ciphertext: bufferToBase64url(ciphertext),
    tag: bufferToBase64url(tag),
    algorithm: "AES-256-GCM",
  };
}

/**
 * Decrypt an AES-256-GCM encrypted payload back to a UTF-8 string.
 *
 * @param data  EncryptedData with iv, ciphertext, tag
 * @param key   AES-GCM CryptoKey (256-bit)
 * @returns     Decrypted UTF-8 string
 */
export async function decryptAesGcm(
  data: EncryptedData,
  key: CryptoKey,
): Promise<string> {
  const iv = base64urlToBuffer(data.iv);
  const ciphertext = base64urlToBuffer(data.ciphertext);
  const tag = base64urlToBuffer(data.tag);

  // Recombine ciphertext + tag as Web Crypto expects
  const combined = new Uint8Array(ciphertext.byteLength + tag.byteLength);
  combined.set(new Uint8Array(ciphertext), 0);
  combined.set(new Uint8Array(tag), ciphertext.byteLength);

  let decrypted: ArrayBuffer;
  try {
    decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, tagLength: config.aesTagLength },
      key,
      combined,
    );
  } catch (err) {
    throw new DecryptionError("AES-GCM decryption failed", err);
  }

  return new TextDecoder().decode(decrypted);
}
