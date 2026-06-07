import { CryptoConfig } from "../types";

export const DEFAULT_CRYPTO_CONFIG: CryptoConfig = {
  aesKeySize: 256,
  aesTagLength: 128,
  aesIvLength: 12,
  rsaKeySize: 4096,
  rsaHash: "SHA-256",
  pbkdf2Hash: "SHA-512",
  pbkdf2Iterations: 600_000,
  saltLength: 32,
};

export const KEY_USAGES = {
  AES_GCM: ["encrypt", "decrypt"] as KeyUsage[],
  RSA_ENCRYPT: ["encrypt", "decrypt"] as KeyUsage[],
  RSA_WRAP: ["wrapKey", "unwrapKey"] as KeyUsage[],
} as const;

export const KEY_ALGORITHM_NAMES = {
  AES_GCM: "AES-GCM",
  RSA_OAEP: "RSA-OAEP",
  PBKDF2: "PBKDF2",
  SHA_256: "SHA-256",
  SHA_512: "SHA-512",
} as const;
