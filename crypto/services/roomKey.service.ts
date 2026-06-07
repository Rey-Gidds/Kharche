import { KEY_USAGES } from "../utils/constants";
import { encryptAesGcm, decryptAesGcm } from "./aes.service";
import { encryptWithPublicKey, decryptWithPrivateKey } from "./asymmetric.service";
import { exportAesKeyRaw, importAesKeyRaw } from "../utils/keySerializer";
import { bufferToBase64url, base64urlToBuffer } from "../utils/encoding";
import { EncryptedData } from "../types";

/** Payload that gets encrypted for RoomTicket documents */
export interface TicketPayload {
  title: string;
  description: string;
}

/**
 * Generate a new AES-256-GCM room key.
 */
export async function generateRoomKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    KEY_USAGES.AES_GCM,
  );
}

/**
 * Encrypt a room key for a specific user under their RSA public key.
 *
 * The room key is exported as raw bytes, converted to a base64url string,
 * then RSA-OAEP encrypted with the user's public key.
 */
export async function encryptRoomKeyForUser(
  roomKey: CryptoKey,
  userPublicKey: CryptoKey,
): Promise<string> {
  const rawKeyBytes = await exportAesKeyRaw(roomKey);
  const keyString = bufferToBase64url(new Uint8Array(rawKeyBytes));
  const encrypted = await encryptWithPublicKey(keyString, userPublicKey);
  return JSON.stringify(encrypted);
}

/**
 * Decrypt a room key using the user's RSA private key.
 *
 * @param encryptedRoomKey - JSON-stringified AsymmetricEncryptedData
 * @param privateKey - The user's RSA-OAEP private key
 * @returns The decrypted AES-256-GCM CryptoKey
 */
export async function decryptRoomKey(
  encryptedRoomKey: string,
  privateKey: CryptoKey,
): Promise<CryptoKey> {
  const parsed = JSON.parse(encryptedRoomKey);
  const keyString = await decryptWithPrivateKey(parsed, privateKey);
  const rawBytes = base64urlToBuffer(keyString);
  return await importAesKeyRaw(rawBytes, true);
}

/**
 * Encrypt a room name using the room's AES key.
 */
export async function encryptRoomName(
  name: string,
  roomKey: CryptoKey,
): Promise<string> {
  const encrypted = await encryptAesGcm(name, roomKey);
  return JSON.stringify(encrypted);
}

/**
 * Decrypt a room name using the room's AES key.
 */
export async function decryptRoomName(
  encryptedPayload: string,
  roomKey: CryptoKey,
): Promise<string> {
  const parsed: EncryptedData = JSON.parse(encryptedPayload);
  return await decryptAesGcm(parsed, roomKey);
}

/**
 * Encrypt a ticket payload using the room key.
 * Returns individual encrypted fields for title and description.
 */
export async function encryptTicketPayload(
  payload: TicketPayload,
  roomKey: CryptoKey,
): Promise<{ encryptedTitle: string; encryptedDescription: string }> {
  const encryptedTitle = JSON.stringify(await encryptAesGcm(payload.title, roomKey));
  const encryptedDescription = JSON.stringify(await encryptAesGcm(payload.description, roomKey));
  return { encryptedTitle, encryptedDescription };
}

/**
 * Decrypt a ticket payload using the room key.
 * Takes an object with encryptedTitle and encryptedDescription strings.
 */
export async function decryptTicketPayload(
  encrypted: { encryptedTitle: string; encryptedDescription: string },
  roomKey: CryptoKey,
): Promise<TicketPayload> {
  const titleParsed: EncryptedData = JSON.parse(encrypted.encryptedTitle);
  const title = await decryptAesGcm(titleParsed, roomKey);
  const descParsed: EncryptedData = JSON.parse(encrypted.encryptedDescription);
  const description = await decryptAesGcm(descParsed, roomKey);
  return { title, description };
}
