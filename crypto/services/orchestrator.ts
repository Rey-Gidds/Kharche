/**
 * Client-side encryption orchestration.
 *
 * All crypto operations run in the browser via Web Crypto API.
 * The server only stores encrypted blobs — it never sees passphrases or plaintext keys.
 *
 * Key hierarchy:
 *   Passphrase → PBKDF2 → Wrapping Key
 *                              ↓ AES-GCM
 *                         Master Key (AES-256)
 *                              ↓ AES-GCM
 *                         Private Key (RSA-4096)
 *   Recovery Key → AES-GCM → Master Key (recovery path)
 */

import { deriveKeyFromPassphrase, deriveWrappingKey } from "./keyDerivation.service";
import { encryptAesGcm, decryptAesGcm } from "./aes.service";
import { generateKeyPair, encryptWithPublicKey, decryptWithPrivateKey } from "./asymmetric.service";
import { exportKeyToJwk } from "../utils/keySerializer";
import { generateRecoveryKey, importRecoveryKey } from "./recoveryKey.service";
import { EncryptedData, AsymmetricEncryptedData } from "../types";
import { bufferToBase64url } from "../utils/encoding";

export interface SetupResult {
  /** JSON-stringified JWK of the public key (stored on server) */
  publicKey: string;
  /** JSON-stringified EncryptedData: master key encrypted with wrapping key */
  encryptedMasterKey: string;
  /** base64url PBKDF2 salt */
  salt: string;
  /** JSON-stringified EncryptedData: private key JWK encrypted with master key */
  encryptedPrivateKey: string;
  /** JSON-stringified EncryptedData: master key encrypted with recovery key */
  recoveryKeyEnvelope: string;
  /** JSON-stringified EncryptedData: passphrase encrypted with recovery key */
  encryptedPassphrase: string;
  /** The raw recovery key string to show the user (not stored on server) */
  recoveryKey: string;
}

export interface UnlockedKeys {
  masterKey: CryptoKey;
  privateKey: CryptoKey;
}

/**
 * Full encryption setup: generates keys, encrypts the hierarchy, creates recovery key.
 *
 * Runs entirely on the client. Returns the data the server needs to store
 * and the recovery key the user must save.
 */
export async function setupEncryption(passphrase: string): Promise<SetupResult> {
  // 1. Generate RSA-4096 key pair
  const { publicKey, privateKey } = await generateKeyPair();

  // 2. Generate AES-256 master key (for bulk personal data encryption)
  const masterKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );

  // 3. Derive wrapping key from passphrase (generates random salt)
  const { key: wrappingKey, salt } = await deriveWrappingKey(passphrase);

  // 4. Encrypt master key with wrapping key
  const masterKeyRaw = await crypto.subtle.exportKey("raw", masterKey);
  const masterKeyB64 = bufferToBase64url(masterKeyRaw);
  const encryptedMasterKeyData = await encryptAesGcm(masterKeyB64, wrappingKey);

  // 5. Export and encrypt private key with master key
  const privateKeyJwk = await exportKeyToJwk(privateKey);
  const privateKeyJson = JSON.stringify(privateKeyJwk);
  const encryptedPrivateKeyData = await encryptAesGcm(privateKeyJson, masterKey);

  // 6. Generate recovery key and encrypt master key with it
  const { key: recoveryKey, encoded: recoveryKeyEncoded } = await generateRecoveryKey();
  const recoveryKeyEnvelopeData = await encryptAesGcm(masterKeyB64, recoveryKey);

  // 7. Encrypt the original passphrase with the recovery key
  const encryptedPassphraseData = await encryptAesGcm(passphrase, recoveryKey);

  return {
    publicKey: JSON.stringify(await exportKeyToJwk(publicKey)),
    encryptedMasterKey: JSON.stringify(encryptedMasterKeyData),
    salt,
    encryptedPrivateKey: JSON.stringify(encryptedPrivateKeyData),
    recoveryKeyEnvelope: JSON.stringify(recoveryKeyEnvelopeData),
    encryptedPassphrase: JSON.stringify(encryptedPassphraseData),
    recoveryKey: recoveryKeyEncoded,
  };
}

/**
 * Unlock the master key and private key using the user's passphrase.
 */
export async function unlockWithPassphrase(
  passphrase: string,
  salt: string,
  encryptedMasterKeyJson: string,
  encryptedPrivateKeyJson: string,
): Promise<UnlockedKeys> {
  // 1. Derive wrapping key from passphrase + stored salt
  const { key: wrappingKey } = await deriveWrappingKey(passphrase, salt);

  // 2. Decrypt master key
  const encryptedMasterKey: EncryptedData = JSON.parse(encryptedMasterKeyJson);
  const masterKeyB64 = await decryptAesGcm(encryptedMasterKey, wrappingKey);
  const masterKeyRaw = new Uint8Array(
    atob(masterKeyB64.replace(/-/g, "+").replace(/_/g, "/"))
      .split("")
      .map((c) => c.charCodeAt(0)),
  );
  const masterKey = await crypto.subtle.importKey(
    "raw",
    masterKeyRaw.buffer,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"],
  );

  // 3. Decrypt private key with master key
  const encryptedPrivateKey: EncryptedData = JSON.parse(encryptedPrivateKeyJson);
  const privateKeyJwkJson = await decryptAesGcm(encryptedPrivateKey, masterKey);
  const privateKeyJwk: JsonWebKey = JSON.parse(privateKeyJwkJson);
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    privateKeyJwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"],
  );

  return { masterKey, privateKey };
}

/**
 * Unlock using the recovery key (when passphrase is lost).
 */
export async function unlockWithRecoveryKey(
  recoveryKeyEncoded: string,
  recoveryKeyEnvelopeJson: string,
): Promise<CryptoKey> {
  const recoveryKey = await importRecoveryKey(recoveryKeyEncoded);
  const envelope: EncryptedData = JSON.parse(recoveryKeyEnvelopeJson);
  const masterKeyB64 = await decryptAesGcm(envelope, recoveryKey);

  const masterKeyRaw = new Uint8Array(
    atob(masterKeyB64.replace(/-/g, "+").replace(/_/g, "/"))
      .split("")
      .map((c) => c.charCodeAt(0)),
  );
  return crypto.subtle.importKey(
    "raw",
    masterKeyRaw.buffer,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"],
  );
}

/**
 * Decrypt the stored passphrase using the recovery key.
 * Called when the user enters their recovery key during recovery flow.
 *
 * @param recoveryKeyEncoded  Base64url-encoded 256-bit recovery key
 * @param encryptedPassphraseJson  JSON-stringified EncryptedData from the server
 * @returns The original passphrase as a plaintext string
 */
export async function recoverPassphrase(
  recoveryKeyEncoded: string,
  encryptedPassphraseJson: string,
): Promise<string> {
  const recoveryKey = await importRecoveryKey(recoveryKeyEncoded);
  const encryptedData: EncryptedData = JSON.parse(encryptedPassphraseJson);
  return decryptAesGcm(encryptedData, recoveryKey);
}

/**
 * Re-wrap the master key with a new passphrase (for passphrase change).
 * Requires the current unlocked master key.
 */
export async function rewrapMasterKey(
  masterKey: CryptoKey,
  newPassphrase: string,
): Promise<{ encryptedMasterKey: string; salt: string }> {
  const masterKeyRaw = await crypto.subtle.exportKey("raw", masterKey);
  const masterKeyB64 = bufferToBase64url(masterKeyRaw);

  const { key: newWrappingKey, salt } = await deriveWrappingKey(newPassphrase);
  const encrypted = await encryptAesGcm(masterKeyB64, newWrappingKey);

  return {
    encryptedMasterKey: JSON.stringify(encrypted),
    salt,
  };
}
