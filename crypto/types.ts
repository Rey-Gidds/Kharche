/** Result of AES-256-GCM encryption */
export interface EncryptedData {
  iv: string;
  ciphertext: string;
  tag: string;
  algorithm: "AES-256-GCM";
}

/** A raw CryptoKey pair before serialization */
export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

/** Serialized key pair for storage/transport (JWK) */
export interface SerializedKeyPair {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}

/** Output of a key-derivation operation */
export interface DerivedKey {
  key: CryptoKey;
  salt: string;
}

/** Output of RSA-OAEP asymmetric encryption */
export interface AsymmetricEncryptedData {
  ciphertext: string;
  algorithm: "RSA-OAEP-4096-SHA-256";
}

/** Configuration for the crypto module */
export interface CryptoConfig {
  aesKeySize: 256;
  aesTagLength: 128;
  aesIvLength: 12;
  rsaKeySize: 4096;
  rsaHash: "SHA-256";
  pbkdf2Hash: "SHA-512";
  pbkdf2Iterations: number;
  saltLength: 32;
}

/** Named algorithms used throughout the system */
export const ALGORITHMS = {
  AES_GCM: "AES-GCM",
  RSA_OAEP: "RSA-OAEP",
  PBKDF2: "PBKDF2",
  SHA_256: "SHA-256",
  SHA_512: "SHA-512",
} as const;

/** A room key encrypted for a specific user under their RSA public key */
export interface RoomKeyEnvelope {
  userId: string;
  encryptedRoomKey: string; // AsymmetricEncryptedData JSON (RSA-OAEP encrypted)
}

/** A room's symmetric key bound to a version */
export interface RoomKeyMaterial {
  key: CryptoKey;
  version: number;
}
