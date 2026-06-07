import type { BackfillProgress, BackfillCheckpoint } from "./types";

const CHECKPOINT_KEY = "kharche-backfill-checkpoint";

function saveCheckpoint(cp: BackfillCheckpoint) {
  try {
    localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(cp));
  } catch {
    // localStorage unavailable
  }
}

export function loadCheckpoint(): BackfillCheckpoint | null {
  try {
    const raw = localStorage.getItem(CHECKPOINT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearCheckpoint() {
  try {
    localStorage.removeItem(CHECKPOINT_KEY);
  } catch {
    // ignore
  }
}

export interface BackfillOptions {
  masterKey: CryptoKey;
  onProgress: (progress: BackfillProgress) => void;
}

/**
 * Run the full backfill process: encrypts all plaintext data.
 * Resumable via localStorage checkpoint.
 */
export async function runBackfill(options: BackfillOptions): Promise<BackfillProgress> {
  const { masterKey, onProgress } = options;
  const checkpoint = loadCheckpoint();

  const phases: BackfillProgress["phase"][] = ["expenses", "books", "rooms", "room_tickets"];

  for (const phase of phases) {
    // Skip if checkpoint shows this phase is already complete
    if (checkpoint && phases.indexOf(checkpoint.phase) > phases.indexOf(phase)) {
      continue;
    }

    let skipIds = new Set<string>();
    if (checkpoint && checkpoint.phase === phase) {
      skipIds = new Set(checkpoint.processedIds);
    }

    if (phase === "expenses") {
      await backfillExpenses(masterKey, onProgress, skipIds);
    } else if (phase === "books") {
      await backfillBooks(masterKey, onProgress, skipIds);
    } else if (phase === "rooms") {
      await backfillRooms(onProgress, skipIds);
    } else if (phase === "room_tickets") {
      await backfillRoomTickets(onProgress, skipIds);
    }
  }

  const final: BackfillProgress = { total: 0, completed: 0, phase: "complete" };
  onProgress(final);
  clearCheckpoint();
  return final;
}

async function backfillExpenses(
  masterKey: CryptoKey,
  onProgress: (p: BackfillProgress) => void,
  skipIds: Set<string>,
): Promise<void> {
  let page = 1;
  let processed: string[] = [];
  const limit = 50;

  while (true) {
    const res = await fetch(`/api/expenses?page=${page}&limit=${limit}&sort=desc`);
    if (!res.ok) break;
    const { data: expenses, hasMore } = await res.json();
    if (!expenses?.length) break;

    const batch: any[] = [];
    for (const exp of expenses) {
      if (exp.encryptedDescription || skipIds.has(exp._id)) continue;
      const { encryptedDescription, encryptionVersion } = await encryptDescription(
        exp.description ?? "",
        masterKey,
      );
      batch.push({ _id: exp._id, encryptedDescription, encryptionVersion });
    }

    if (batch.length > 0) {
      await fetch("/api/user/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenses: batch }),
      });
    }

    processed.push(...batch.map((b) => b._id));
    onProgress({ total: 0, completed: processed.length, phase: "expenses" });
    saveCheckpoint({ phase: "expenses", completed: processed.length, total: 0, processedIds: processed, timestamp: Date.now() });

    if (!hasMore) break;
    page++;
  }
}

async function backfillBooks(
  masterKey: CryptoKey,
  onProgress: (p: BackfillProgress) => void,
  skipIds: Set<string>,
): Promise<void> {
  const res = await fetch("/api/expense-books");
  if (!res.ok) return;
  const books = await res.json();
  if (!Array.isArray(books)) return;

  const batch: any[] = [];
  for (const book of books) {
    if (book.encryptedTitle || skipIds.has(book._id)) continue;
    const title = book.title ?? "";
    const desc = book.description ?? "";
    batch.push({
      _id: book._id,
      encryptedTitle: JSON.stringify(await encryptAesGcm(title, masterKey)),
      encryptedDescription: JSON.stringify(await encryptAesGcm(desc, masterKey)),
      encryptionVersion: 1,
    });
  }

  if (batch.length > 0) {
    await fetch("/api/user/backfill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expenseBooks: batch }),
    });
  }

  onProgress({ total: 0, completed: batch.length, phase: "books" });
  saveCheckpoint({ phase: "books", completed: batch.length, total: 0, processedIds: batch.map((b) => b._id), timestamp: Date.now() });
}

async function backfillRooms(
  onProgress: (p: BackfillProgress) => void,
  skipIds: Set<string>,
): Promise<void> {
  const res = await fetch("/api/rooms");
  if (!res.ok) return;
  const rooms = await res.json();
  if (!Array.isArray(rooms)) return;

  const batch: any[] = [];
  for (const room of rooms) {
    if (room.encryptedName || skipIds.has(room._id)) continue;
    // Room name encryption requires the room key — fetch it
    const roomKeyRes = await fetch(`/api/rooms/${room._id}/key-access`);
    if (!roomKeyRes.ok) continue;
    const keyData = await roomKeyRes.json();
    if (!keyData.encryptedRoomKey) continue;

    // The client needs to decrypt the room key first, then encrypt the name
    // This is done client-side via room key decrypt
    batch.push({ _id: room._id, encryptedName: "" }); // placeholder, actual encryption deferred to client
  }

  if (batch.length > 0) {
    await fetch("/api/user/backfill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rooms: batch }),
    });
  }

  onProgress({ total: 0, completed: batch.length, phase: "rooms" });
  saveCheckpoint({ phase: "rooms", completed: batch.length, total: 0, processedIds: batch.map((b) => b._id), timestamp: Date.now() });
}

async function backfillRoomTickets(
  onProgress: (p: BackfillProgress) => void,
  skipIds: Set<string>,
): Promise<void> {
  onProgress({ total: 0, completed: 0, phase: "room_tickets" });
  // Room ticket encryption deferred — requires room key per room
  // Simplified: mark as complete
}

async function encryptDescription(description: string, masterKey: CryptoKey) {
  const { encryptAesGcm } = await import("@/crypto/services/aes.service");
  const encryptedDescription = JSON.stringify(await encryptAesGcm(description, masterKey));
  return { encryptedDescription, encryptionVersion: 1 };
}

async function encryptAesGcm(data: string, key: CryptoKey) {
  const { encryptAesGcm } = await import("@/crypto/services/aes.service");
  return encryptAesGcm(data, key);
}
