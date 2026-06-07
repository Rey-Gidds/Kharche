export type {
  EncryptedData,
  KeyPair,
  SerializedKeyPair,
  DerivedKey,
  AsymmetricEncryptedData,
  CryptoConfig,
} from "./types";
export {
  encryptExpensePayload,
  decryptExpensePayload,
  encryptExpenseBookPayload,
  decryptExpenseBookPayload,
} from "./services/payloadEncryption.service";
export type { ExpensePayload as ExpenseEncryptionPayload, ExpenseBookPayload as ExpenseBookEncryptionPayload } from "./services/payloadEncryption.service";

export { ALGORITHMS } from "./types";

export {
  CryptoError,
  KeyDerivationError,
  EncryptionError,
  DecryptionError,
  KeyImportError,
  KeyExportError,
  CryptoConfigError,
} from "./errors";

export {
  encryptAesGcm,
  decryptAesGcm,
} from "./services/aes.service";

export {
  generateKeyPair,
  encryptWithPublicKey,
  decryptWithPrivateKey,
} from "./services/asymmetric.service";

export {
  deriveKeyFromPassphrase,
  deriveWrappingKey,
} from "./services/keyDerivation.service";

export {
  setupEncryption,
  unlockWithPassphrase,
  unlockWithRecoveryKey,
  recoverPassphrase,
  rewrapMasterKey,
} from "./services/orchestrator";

export {
  generateRecoveryKey,
  importRecoveryKey,
} from "./services/recoveryKey.service";

export {
  getPublicKey,
  getUserPublicKey,
} from "./services/keyAccess";

export {
  generateRoomKey,
  encryptRoomKeyForUser,
  decryptRoomKey,
  encryptRoomName,
  decryptRoomName,
  encryptTicketPayload,
  decryptTicketPayload,
} from "./services/roomKey.service";
export type { TicketPayload } from "./services/roomKey.service";

export {
  bufferToBase64url,
  base64urlToBuffer,
  uint8ArrayToHex,
  hexToUint8Array,
  stringToUtf8Bytes,
  utf8BytesToString,
} from "./utils/encoding";

export {
  exportKeyToJwk,
  importKeyFromJwk,
  exportAesKeyRaw,
  importAesKeyRaw,
} from "./utils/keySerializer";

export { DEFAULT_CRYPTO_CONFIG } from "./utils/constants";

// IndexedDB stores
export { getDb, getRecord, putRecord, deleteRecord, clearStore, getAllRecords } from "./indexeddb/db";
export { StoreName } from "./indexeddb/stores";
export type { MasterKeyCacheRecord, PrivateKeyCacheRecord, RoomKeyCacheRecord } from "./indexeddb/stores";
export { cacheMasterKey, getCachedMasterKey, removeCachedMasterKey, clearMasterKeyCache } from "./indexeddb/masterKeyStore";
export { cachePrivateKey, getCachedPrivateKey, removeCachedPrivateKey, clearPrivateKeyCache } from "./indexeddb/privateKeyStore";
export { cacheRoomKey, getCachedRoomKey, removeCachedRoomKey, getAllCachedRoomKeys, clearRoomKeyCache } from "./indexeddb/roomKeyStore";
export {
  unlockKeys,
  lockKeys,
  getMasterKey,
  getPrivateKey,
  getCachedUserId,
  setInMemoryKeys,
  getRoomKeyEncrypted,
  setRoomKeyEncrypted,
  getRoomKeyDecrypted,
  hydrateFromCache,
  logoutCleanup,
  onSyncEvent,
  storeDerivedKeys,
  tryAutoUnlock,
} from "./indexeddb/cacheManager";
export type { HydrationResult, SyncEvent } from "./indexeddb/cacheManager";
