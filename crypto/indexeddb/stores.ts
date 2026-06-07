export const DB_NAME = "kharche-encryption";
export const DB_VERSION = 2;

export enum StoreName {
  MasterKeyCache = "master_key_cache",
  PrivateKeyCache = "private_key_cache",
  RoomKeyCache = "room_key_cache",
  DerivedKeyCache = "derived_key_cache",
}

export interface MasterKeyCacheRecord {
  userId: string;
  /** JSON-stringified EncryptedData of the wrapping-key-encrypted master key */
  encryptedMasterKey: string;
  /** base64url PBKDF2 salt */
  salt: string;
  /** Timestamp when cached (epoch ms) */
  cachedAt: number;
}

export interface PrivateKeyCacheRecord {
  userId: string;
  /** JSON-stringified EncryptedData of the master-key-encrypted private key */
  encryptedPrivateKey: string;
  /** Timestamp when cached (epoch ms) */
  cachedAt: number;
}

export interface RoomKeyCacheRecord {
  roomId: string;
  userId: string;
  /** JSON-stringified AsymmetricEncryptedData of the room key encrypted with user's public key */
  encryptedRoomKey: string;
  /** The key version this belongs to */
  keyVersion: number;
  /** Timestamp when cached (epoch ms) */
  cachedAt: number;
}

export interface DerivedKeyCacheRecord {
  userId: string;
  /** base64url-encoded raw AES-256 key bytes */
  masterKeyRaw: string;
  /** JSON-stringified JWK of the RSA-OAEP private key */
  privateKeyJwk: string;
  /** Timestamp when cached (epoch ms) */
  cachedAt: number;
}

export const STORE_CONFIGS: Record<
  StoreName,
  { keyPath: string; indexes?: { name: string; keyPath: string; unique?: boolean }[] }
> = {
  [StoreName.MasterKeyCache]: {
    keyPath: "userId",
  },
  [StoreName.PrivateKeyCache]: {
    keyPath: "userId",
  },
  [StoreName.RoomKeyCache]: {
    keyPath: "roomId",
    indexes: [
      { name: "userId", keyPath: "userId" },
      { name: "keyVersion", keyPath: "keyVersion" },
    ],
  },
  [StoreName.DerivedKeyCache]: {
    keyPath: "userId",
  },
};
