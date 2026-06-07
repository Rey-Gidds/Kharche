import { encryptAesGcm, decryptAesGcm } from "./aes.service";
import { EncryptedData } from "../types";
import { EncryptionError, DecryptionError } from "../errors";

/** Payload that gets encrypted for Expense documents */
export interface ExpensePayload {
  description: string;
}

/** Payload that gets encrypted for ExpenseBook documents */
export interface ExpenseBookPayload {
  title: string;
  description: string;
}

/**
 * Encrypt an expense payload using the user's master key.
 * Encrypts description only (amount stays plaintext).
 */
export async function encryptExpensePayload(
  payload: ExpensePayload,
  masterKey: CryptoKey,
): Promise<{ encryptedDescription: string; encryptionVersion: number }> {
  try {
    const encryptedDescription = JSON.stringify(await encryptAesGcm(payload.description, masterKey));
    return {
      encryptedDescription,
      encryptionVersion: 1,
    };
  } catch (err) {
    throw new EncryptionError("Failed to encrypt expense payload", err);
  }
}

/**
 * Decrypt an expense payload using the user's master key.
 * Falls back to plaintext fields if encrypted fields don't exist (legacy data).
 */
export async function decryptExpensePayload(
  expense: { encryptedDescription?: string | null; description?: string },
  masterKey: CryptoKey,
): Promise<{ description: string }> {
  if (!expense.encryptedDescription) {
    return {
      description: expense.description ?? "",
    };
  }

  try {
    const descEncrypted: EncryptedData = JSON.parse(expense.encryptedDescription);
    const description = await decryptAesGcm(descEncrypted, masterKey);
    return { description };
  } catch (err) {
    throw new DecryptionError("Failed to decrypt expense payload", err);
  }
}

/**
 * Encrypt an expense book payload using the user's master key.
 * Encrypts title and description separately.
 */
export async function encryptExpenseBookPayload(
  payload: ExpenseBookPayload,
  masterKey: CryptoKey,
): Promise<{ encryptedTitle: string; encryptedDescription: string; encryptionVersion: number }> {
  try {
    const encryptedTitle = JSON.stringify(await encryptAesGcm(payload.title, masterKey));
    const encryptedDescription = JSON.stringify(await encryptAesGcm(payload.description, masterKey));
    return {
      encryptedTitle,
      encryptedDescription,
      encryptionVersion: 1,
    };
  } catch (err) {
    throw new EncryptionError("Failed to encrypt expense book payload", err);
  }
}

/**
 * Decrypt an expense book payload using the user's master key.
 * Falls back to plaintext fields if encrypted fields don't exist (legacy data).
 */
export async function decryptExpenseBookPayload(
  book: { encryptedTitle?: string | null; encryptedDescription?: string | null; title?: string; description?: string },
  masterKey: CryptoKey,
): Promise<{ title: string; description: string }> {
  if (!book.encryptedTitle) {
    return {
      title: book.title ?? "",
      description: book.description ?? "",
    };
  }

  try {
    const titleEncrypted: EncryptedData = JSON.parse(book.encryptedTitle);
    const title = await decryptAesGcm(titleEncrypted, masterKey);
    const descEncrypted: EncryptedData = JSON.parse(book.encryptedDescription ?? "{}");
    const description = await decryptAesGcm(descEncrypted, masterKey);
    return { title, description };
  } catch (err) {
    throw new DecryptionError("Failed to decrypt expense book payload", err);
  }
}
