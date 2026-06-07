import { DEFAULT_CRYPTO_CONFIG } from "../utils/constants";
import { bufferToBase64url, base64urlToBuffer } from "../utils/encoding";
import { EncryptionError, DecryptionError } from "../errors";
import { AsymmetricEncryptedData, KeyPair } from "../types";
import { KEY_USAGES } from "../utils/constants";

const config = DEFAULT_CRYPTO_CONFIG;

/**
 * Generate an RSA-OAEP 4096-bit key pair.
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: config.rsaKeySize,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: config.rsaHash,
    },
    true,
    KEY_USAGES.RSA_ENCRYPT,
  );
  return keyPair;
}

/**
 * Encrypt plaintext using an RSA-OAEP public key.
 * NOTE: RSA-4096 can encrypt at most ~446 bytes of plaintext.
 *       For larger data, encrypt with AES-GCM and encrypt the AES key with RSA.
 *
 * @param plaintext  UTF-8 string (must be short enough for RSA-4096)
 * @param publicKey  RSA-OAEP public CryptoKey
 */
export async function encryptWithPublicKey(
  plaintext: string,
  publicKey: CryptoKey,
): Promise<AsymmetricEncryptedData> {
  const encoded = new TextEncoder().encode(plaintext);

  let ciphertext: ArrayBuffer;
  try {
    ciphertext = await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      publicKey,
      encoded,
    );
  } catch (err) {
    throw new EncryptionError("RSA-OAEP encryption failed", err);
  }

  return {
    ciphertext: bufferToBase64url(ciphertext),
    algorithm: "RSA-OAEP-4096-SHA-256",
  };
}

/**
 * Decrypt ciphertext using an RSA-OAEP private key.
 *
 * @param data        AsymmetricEncryptedData
 * @param privateKey  RSA-OAEP private CryptoKey
 * @returns           Decrypted UTF-8 string
 */
export async function decryptWithPrivateKey(
  data: AsymmetricEncryptedData,
  privateKey: CryptoKey,
): Promise<string> {
  const ciphertext = base64urlToBuffer(data.ciphertext);

  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      ciphertext,
    );
  } catch (err) {
    throw new DecryptionError("RSA-OAEP decryption failed", err);
  }

  return new TextDecoder().decode(plaintext);
}
