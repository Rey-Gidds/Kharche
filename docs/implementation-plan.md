# Implementation Plan: Auto-Unlock + Instant SWR Updates

## Feature 1: Auto-Unlock via IndexedDB (24h TTL)

### Problem

On every page reload, the user must re-enter their passphrase even though the derived AES master key and RSA private key have already been computed in a previous session. The current `hydrateFromCache()` only retrieves **encrypted blobs** — the user still needs their passphrase to decrypt them.

### Solution

Store the raw derived key material in a new IndexedDB store (`DerivedKeyCache`) so it can be re-imported directly into `CryptoKey` objects without the passphrase. Use a 24-hour TTL so the user must periodically re-authenticate.

### Key Hierarchy Reminder

```
Passphrase → PBKDF2 → Wrapping Key
                             ↓ AES-GCM
                        Master Key (AES-256) ← what we store raw in DerivedKeyCache
                             ↓ AES-GCM
                        Private Key (RSA-4096) ← what we store JWK in DerivedKeyCache
```

<details>
<summary>Note on security</summary>

The derived keys stored in IndexedDB are as exposed as the user's IndexedDB database. Since IndexedDB is sandboxed per origin, only code from your domain can read it. The 24-hour TTL limits the exposure window. For stronger protection, you could encrypt the derived key cache with a key derived from the browser's `crypto.subtle` + a stored wrapping key, but this adds complexity without meaningfully improving security — any script running on the same origin can already intercept the passphrase via DOM events.
</details>

---

### File Changes

#### 1. `crypto/indexeddb/stores.ts` — Add new store, bump DB version

**Changes:**
- Bump `DB_VERSION` from `1` to `2`
- Add `DerivedKeyCache` to `StoreName` enum
- Add `DerivedKeyCacheRecord` interface
- Add store config to `STORE_CONFIGS`

**New store schema:**

```typescript
export enum StoreName {
  MasterKeyCache = "master_key_cache",
  PrivateKeyCache = "private_key_cache",
  RoomKeyCache = "room_key_cache",
  DerivedKeyCache = "derived_key_cache",  // NEW
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
```

**Store config:**
```typescript
[StoreName.DerivedKeyCache]: {
  keyPath: "userId",
}
```

#### 2. `crypto/indexeddb/derivedKeyStore.ts` — New file

CRUD operations for the DerivedKeyCache store.

**Exports:**
- `cacheDerivedKeys(userId, masterKeyRaw, privateKeyJwk)` → writes to DerivedKeyCache with `cachedAt: Date.now()`
- `getDerivedKeys(userId)` → reads from DerivedKeyCache, returns `DerivedKeyCacheRecord | undefined`
- `removeDerivedKeys(userId)` → deletes record
- `clearDerivedKeys()` → clears entire store

Each function uses the generic IndexedDB helpers from `db.ts` (`putRecord`, `getRecord`, `deleteRecord`, `clearStore`).

#### 3. `crypto/indexeddb/cacheManager.ts` — Add auto-unlock logic, update cleanup

**New constants:**
```typescript
const DERIVED_KEY_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
```

**New functions to add:**

```typescript
/**
 * Export and store derived keys in IndexedDB for auto-unlock on next load.
 * Called after every successful passphrase unlock.
 */
export async function storeDerivedKeys(
  userId: string,
  masterKey: CryptoKey,
  privateKey: CryptoKey,
): Promise<void> {
  // Export master key to raw bytes
  const masterKeyRaw = await exportAesKeyRaw(masterKey);
  const masterKeyRawB64 = bufferToBase64url(new Uint8Array(masterKeyRaw));

  // Export private key to JWK
  const privateKeyJwk = await exportKeyToJwk(privateKey);
  const privateKeyJwkJson = JSON.stringify(privateKeyJwk);

  await cacheDerivedKeys(userId, masterKeyRawB64, privateKeyJwkJson);
}

/**
 * Try to auto-unlock from cached derived keys.
 * Checks TTL and re-imports CryptoKey objects.
 * Returns the unlocked keys if successful, null if expired/missing.
 *
 * On success, populates the in-memory store as a side-effect.
 */
export async function tryAutoUnlock(userId: string): Promise<UnlockedKeys | null> {
  const record = await getDerivedKeys(userId);
  if (!record) return null;

  // Check TTL
  if (isStale(record.cachedAt, DERIVED_KEY_CACHE_TTL)) {
    await removeDerivedKeys(userId);
    return null;
  }

  try {
    // Re-import master key from raw bytes
    const masterKeyRawBytes = base64urlToBuffer(record.masterKeyRaw);
    const masterKey = await importAesKeyRaw(masterKeyRawBytes, true);

    // Re-import private key from JWK
    const privateKeyJwk: JsonWebKey = JSON.parse(record.privateKeyJwk);
    const privateKey = await importKeyFromJwk(
      privateKeyJwk,
      { name: "RSA-OAEP", hash: "SHA-256" },
      ["decrypt"],
    );

    // Populate in-memory store
    setInMemoryKeys(masterKey, privateKey, userId);

    return { masterKey, privateKey };
  } catch {
    // If import fails, clear corrupted entry
    await removeDerivedKeys(userId);
    return null;
  }
}
```

**Modified functions:**

- `lockKeys()` — add `await removeDerivedKeys(cachedUserId)` after clearing other caches
- `logoutCleanup()` — add `clearDerivedKeys()` to the `Promise.all()` array

**New imports needed:**
```typescript
import {
  cacheDerivedKeys,
  getDerivedKeys,
  removeDerivedKeys,
  clearDerivedKeys,
} from "./derivedKeyStore";
import { exportAesKeyRaw, importAesKeyRaw, exportKeyToJwk, importKeyFromJwk } from "../utils/keySerializer";
import { bufferToBase64url, base64urlToBuffer } from "../utils/encoding";
```

#### 4. `hooks/useEncryption.ts` — Add auto-unlock on startup

**New state:**
```typescript
const [isAutoUnlocking, setIsAutoUnlocking] = useState(true); // starts true, resolves after attempt
```

**New effect** (runs once when encryption status is known):

```typescript
useEffect(() => {
  if (!session?.user?.id || isLoading) return;
  
  if (!isEnabled) {
    // Encryption not enabled — no need to auto-unlock
    setIsAutoUnlocking(false);
    return;
  }

  if (isUnlocked) {
    // Already unlocked (from another tab's BroadcastChannel sync)
    setIsAutoUnlocking(false);
    return;
  }

  let cancelled = false;
  
  (async () => {
    try {
      const keys = await tryAutoUnlock(session.user.id);
      if (cancelled) return;
      
      if (keys) {
        setUnlockedKeys(keys);
      }
      // if keys is null, the existing unlock modal flow takes over
    } finally {
      if (!cancelled) setIsAutoUnlocking(false);
    }
  })();

  return () => { cancelled = true; };
}, [session?.user?.id, isLoading, isEnabled, isUnlocked]);
```

**Modified `unlock()`, `setup()`, `enable()`** — after successful unlock, also call:

```typescript
await storeDerivedKeys(session.user.id, keys.masterKey, keys.privateKey);
```

**Export** `isAutoUnlocking` in the return type:

```typescript
export interface UseEncryptionReturn {
  // ... existing fields
  isAutoUnlocking: boolean; // NEW
}
```

#### 5. `app/components/encryption/EncryptionOverlay.tsx` — Show loading during auto-unlock

**Changes:**
- Read `isAutoUnlocking` from `useEncryption()`
- When `isAutoUnlocking` is `true`, show a minimal loading spinner instead of the unlock modal
- Don't show the unlock modal until `isAutoUnlocking` resolves to `false`

The gating effect currently checks `isLoading || initialized`. Add `isAutoUnlocking` check:

```typescript
useEffect(() => {
  if (isLoading || isAutoUnlocking || initialized) return;
  // ... existing logic
}, [isLoading, isAutoUnlocking, isEnabled, isUnlocked, initialized]);
```

---

### Data Flow: Startup Auto-Unlock

```
Page loads
    ↓
useEncryption mounts
    ↓
status SWR fires → gets encryptionEnabled + setupCompleted
    ↓
isEnabled = true
    ↓
useEffect fires: session?.user?.id available, isEnabled = true
    ↓
tryAutoUnlock(session.user.id)
    ↓
Read DerivedKeyCache from IndexedDB
    ↓
TTL check (24h from cachedAt)
    ↓
[Valid] → importAesKeyRaw(masterKeyRaw) + importKeyFromJwk(privateKeyJwk)
       → setInMemoryKeys(masterKey, privateKey, userId)
       → setUnlockedKeys(keys)
       → isUnlocked = true
       → EncryptionOverlay hides modal
       → getMasterKey() returns non-null
       → Forms encrypt payloads
       → ExpenseList decrypts data

[Expired/Missing] → isAutoUnlocking = false
                  → EncryptionOverlay shows unlock modal
                  → User enters passphrase
                  → unlock() called
                  → storeDerivedKeys() writes to DerivedKeyCache
                  → TTL resets
```

---

## Feature 2: Instant SWR Updates (No Reload Required)

### Problem

Creating or updating expenses, books, or tickets does not reflect in the UI immediately. A manual page reload is needed. The root causes are:

1. **`AddExpenseForm`** — uses global `mutate` with key matcher. SWR 2.x's `revalidateFirstPage: false` (set in `useSWRInfinite`) blocks revalidation of the first page after global mutate.
2. **`AddExpenseBookForm`** — has NO mutate call at all. Relies entirely on `refreshTrigger` prop to force a key change.
3. **`AddTicketModal`** — uses an optimistic update key that doesn't match `RoomTickets`' tuple key, so the optimistic data is invisible.
4. **`refreshTrigger`** pattern — used as a band-aid across `Dashboard` → `ExpenseBookList` → `ExpenseList`. It changes the SWR key, causing a full re-fetch and losing pagination state.

### Solution

Replace the `refreshTrigger` prop-drilling pattern with direct SWR revalidation at the mutation site. Fix the `revalidateFirstPage` interaction. Simplify `AddTicketModal`'s mutation approach.

---

### File Changes

#### 1. `app/components/AddExpenseForm.tsx`

**Current (problematic):**
```typescript
mutate((key) => typeof key === "string" && key.startsWith("/api/expenses"));
```

**Replace with:**
```typescript
import { mutate } from "swr";

// After successful POST:
await mutate(
  (key) => typeof key === "string" && key.startsWith("/api/expenses"),
  undefined,
  { revalidate: true },
);
```

This explicit call with `{ revalidate: true }` forces SWR to re-run the fetcher for all matching keys. However, this still may not work with `useSWRInfinite`'s `revalidateFirstPage: false`.

**Additionally fix the ExpenseList `revalidateFirstPage` issue (see #3 below).**

Remove the `refreshTrigger` dependency from `ExpenseList`'s `getKey`:

```typescript
const getKey = useCallback((pageIndex, previousPageData) => {
  // ...
}, [sortBy, sortOrder, categoryFilter, bookId, dateFilterType, dateFilterValue]);
// refreshTrigger removed
```

#### 2. `app/components/AddExpenseBookForm.tsx`

**Current:** No mutate call.

**Add after successful creation:**
```typescript
import { mutate } from "swr";

// After successful POST:
await mutate(
  (key) => typeof key === "string" && key.startsWith("/api/expense-books"),
  undefined,
  { revalidate: true },
);
onSuccess(); // still close the modal
```

#### 3. `app/components/ExpenseList.tsx`

**Fix `revalidateFirstPage: false` → `true`:**

```typescript
const { data, error, isLoading, isValidating, size, setSize, mutate } = useSWRInfinite(
  getKey,
  fetcher,
  { revalidateFirstPage: true }  // Changed from false to true
);
```

This is the **critical fix**. With `revalidateFirstPage: true`, when global `mutate` triggers revalidation, the first page (the one the user sees) will actually re-fetch.

**Also remove `refreshTrigger` from the component props** since it's no longer needed:

```typescript
interface ExpenseListProps {
  bookId?: string;
  bookTitle?: string;
  bookCurrency?: string;
  onBack?: () => void;
  // refreshTrigger removed
}
```

#### 4. `app/components/ExpenseBookList.tsx`

**Remove `refreshTrigger` from the component and its `getKey` deps:**

```typescript
interface ExpenseBookListProps {
  onSelectBook: (bookId: string, bookTitle: string, bookCurrency: string) => void;
  // refreshTrigger removed
}
```

**`getKey` cleanup:**
```typescript
const getKey = useCallback((pageIndex: number, previousPageData: any) => {
  if (previousPageData && !previousPageData.hasMore) return null;
  return `/api/expense-books?page=${pageIndex + 1}&limit=${PAGE_SIZE}`;
}, []); // No dependencies — key is stable
```

#### 5. `app/components/Dashboard.tsx`

**Remove the `refreshTrigger` state and its prop-drilling:**

```typescript
// Remove this entire block
const [refreshTrigger, setRefreshTrigger] = useState(0);

// Remove onSuccess handlers that increment it
```

**Simplify the component structure:**

```typescript
// Before:
<ExpenseBookList
  onSelectBook={handleSelectBook}
  refreshTrigger={refreshTrigger}
/>

// After:
<ExpenseBookList onSelectBook={handleSelectBook} />

// Before (in ExpenseView):
<ExpenseList
  bookId={selectedBook._id}
  bookTitle={selectedBook.title}
  bookCurrency={selectedBook.currency}
  onBack={handleBack}
  refreshTrigger={refreshTrigger}
/>

// After:
<ExpenseList
  bookId={selectedBook._id}
  bookTitle={selectedBook.title}
  bookCurrency={selectedBook.currency}
  onBack={handleBack}
/>
```

#### 6. `app/components/rooms/AddTicketModal.tsx`

**Simplify mutation — remove optimistic update, just revalidate:**

**Current approach** (broken key mismatch):
```typescript
const ticketKey = `/api/rooms/${room._id}/tickets`;
const statsKey = `/api/rooms/${room._id}/stats`;

await mutate(ticketKey, async () => {
  // ... POST/PUT request
  return fetch(ticketKey).then(r => r.json());
}, {
  optimisticData: [...],
  rollbackOnError: true,
  revalidate: true,
  populateCache: true,
});

onSuccess();
onClose();
```

**Replace with simple mutation:**
```typescript
import { mutate } from "swr";

// POST/PUT request
const res = await fetch(endpoint, { method, body, ... });
if (!res.ok) throw new Error(...);

// Invalidate list
mutate(
  (key) => typeof key === 'string' && key.startsWith(`/api/rooms/${room._id}/tickets`),
  undefined,
  { revalidate: true },
);

// Invalidate stats
mutate(
  (key) => typeof key === 'string' && key.startsWith(`/api/rooms/${room._id}/stats`),
  undefined,
  { revalidate: true },
);

refetchWallet();
onSuccess();
onClose();
```

Optimistic updates are nice but add complexity and are brittle with tuple keys. Simple revalidation provides instant-feeling updates for a list this small (< 50 items per page).

#### 7. `app/components/rooms/RoomTickets.tsx`

**Remove `refreshTrigger` prop type and usage:**

```typescript
interface RoomTicketsProps {
  room: any;
  currentUserId: string;
  // refreshTrigger removed
  roomKey: CryptoKey | null;
}
```

**Remove the `refreshTrigger` effect:**
```typescript
// Remove this entire useEffect:
useEffect(() => {
  if (refreshTrigger > 0) {
    mutateTickets();
  }
}, [refreshTrigger, mutateTickets]);
```

---

### Data Flow: Instant SWR Updates

```
User submits AddExpenseForm
    ↓
POST /api/expenses (creates document)
    ↓
mutate(key => key.startsWith('/api/expenses'), undefined, { revalidate: true })
    ↓
useSWRInfinite in ExpenseList detects revalidation
(revalidateFirstPage: true)
    ↓
Page 1 fetcher runs → GET /api/expenses?page=1&...
    ↓
decryptExpenses() decrypts payloads
    ↓
ExpenseList re-renders with new data
    ↓
User sees the new expense instantly (or as fast as the network)
```

---

## Summary of All Modified Files

| File | Change Type | Feature |
|---|---|---|
| `crypto/indexeddb/stores.ts` | Edit | 1 — Add store config, bump DB version |
| `crypto/indexeddb/derivedKeyStore.ts` | **Create** | 1 — CRUD for derived key cache |
| `crypto/indexeddb/cacheManager.ts` | Edit | 1 — Add `storeDerivedKeys`, `tryAutoUnlock`, update cleanup |
| `hooks/useEncryption.ts` | Edit | 1 — Add auto-unlock effect on startup, call `storeDerivedKeys` |
| `app/components/encryption/EncryptionOverlay.tsx` | Edit | 1 — Show loading during auto-unlock |
| `app/components/AddExpenseForm.tsx` | Edit | 2 — Fix mutate call |
| `app/components/AddExpenseBookForm.tsx` | Edit | 2 — Add mutate call |
| `app/components/ExpenseList.tsx` | Edit | 2 — Fix `revalidateFirstPage`, remove `refreshTrigger` |
| `app/components/ExpenseBookList.tsx` | Edit | 2 — Remove `refreshTrigger` |
| `app/components/Dashboard.tsx` | Edit | 2 — Remove `refreshTrigger` |
| `app/components/rooms/AddTicketModal.tsx` | Edit | 2 — Simplify mutation |
| `app/components/rooms/RoomTickets.tsx` | Edit | 2 — Remove `refreshTrigger` |

---

## Risks and Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Race condition: components render before auto-unlock completes | **High** | `isAutoUnlocking` state with loading overlay prevents premature render |
| IndexedDB DB_VERSION bump breaks existing user data | **Medium** | `onupgradeneeded` uses conditional store creation (`if (!db.objectStoreNames.contains(...))`) — existing stores preserved |
| Global `mutate` + `revalidateFirstPage: true` re-fetches all pages unnecessarily | Low | Only page 1 revalidates. SWR handles deduplication internally. |
| Auto-unlock fails silently on corrupted IndexedDB data | Low | `tryAutoUnlock` catches import errors, clears corrupted entry, returns null → user sees unlock modal |
| Derived key cache consumes IndexedDB quota | Low | Each record is ~2KB — negligible |
</details>
