# Encryption Schema Refactor — Individual Fields + Toggle Simplification

## Goal

Replace the single `encryptedPayload` blob field in all Mongoose models with individual encrypted
fields (one per sensitive value). This gives us queryable fields, better debugging, and a cleaner
architecture. Also simplify the encryption toggle in the account settings to a single slider
(removing the extra Disable button alongside it), and remove the EncryptionLockSlot component
from the header entirely.

---

## Phase 1 — Mongoose Schema Changes

### 1.1 `models/Expense.ts`

**Remove:**
- `encryptedPayload?: string`

**Add:**
- `encryptedAmount?: string` — AES-GCM encrypted amount
- `encryptedDescription?: string` — AES-GCM encrypted description

**Keep (fallback for legacy/unencrypted data):**
- `amount: number`
- `category: string`
- `description?: string`

Before:
```ts
export interface IExpense extends Document {
  userId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  category: string;
  description?: string;
  date: Date;
  encryptedPayload?: string;
  encryptionVersion: number;
  // ...
}
```

After:
```ts
export interface IExpense extends Document {
  userId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  category: string;
  description?: string;
  date: Date;
  encryptedAmount?: string;
  encryptedDescription?: string;
  encryptionVersion: number;
  // ...
}
```

Schema definition change:
```ts
// Remove:
encryptedPayload: { type: String },
// Add:
encryptedAmount: { type: String },
encryptedDescription: { type: String },
```

---

### 1.2 `models/ExpenseBook.ts`

**Remove:**
- `encryptedPayload?: string`

**Add:**
- `encryptedTitle?: string`
- `encryptedDescription?: string`

**Keep (fallback):**
- `title?: string`
- `description?: string`

Before:
```ts
export interface IExpenseBook extends Document {
  userId: mongoose.Types.ObjectId;
  title?: string;
  description?: string;
  currency: string;
  encryptedPayload?: string;
  encryptionVersion: number;
  // ...
}
```

After:
```ts
export interface IExpenseBook extends Document {
  userId: mongoose.Types.ObjectId;
  title?: string;
  description?: string;
  currency: string;
  encryptedTitle?: string;
  encryptedDescription?: string;
  encryptionVersion: number;
  // ...
}
```

Schema definition change:
```ts
// Remove:
encryptedPayload: { type: String },
// Add:
encryptedTitle: { type: String },
encryptedDescription: { type: String },
```

---

### 1.3 `models/Room.ts`

**Remove:**
- `encryptedPayload?: string`

**Add:**
- `encryptedName?: string`

**Keep (fallback):**
- `name: string`

Before:
```ts
export interface IRoom extends Document {
  name: string;
  users: mongoose.Types.ObjectId[];
  bookId: mongoose.Types.ObjectId;
  currency: string;
  activeKeyVersion: number;
  encryptedPayload?: string;
  // ...
}
```

After:
```ts
export interface IRoom extends Document {
  name: string;
  users: mongoose.Types.ObjectId[];
  bookId: mongoose.Types.ObjectId;
  currency: string;
  activeKeyVersion: number;
  encryptedName?: string;
  // ...
}
```

Schema definition change:
```ts
// Remove:
encryptedPayload: { type: String },
// Add:
encryptedName: { type: String },
```

---

### 1.4 `models/RoomTicket.ts`

**Remove:**
- `encryptedPayload?: string`

**Add:**
- `encryptedTitle?: string`
- `encryptedDescription?: string`

**Keep (fallback):**
- `title: string`
- `description?: string`

Before:
```ts
export interface IRoomTicket extends Document {
  // ...
  title: string;
  description?: string;
  totalAmount: number;
  splitType: SplitType;
  distribution: IDistributionEntry[];
  involvedUsers: mongoose.Types.ObjectId[];
  encryptedPayload?: string;
  keyVersion?: number;
  // ...
}
```

After:
```ts
export interface IRoomTicket extends Document {
  // ...
  title: string;
  description?: string;
  totalAmount: number;
  splitType: SplitType;
  distribution: IDistributionEntry[];
  involvedUsers: mongoose.Types.ObjectId[];
  encryptedTitle?: string;
  encryptedDescription?: string;
  keyVersion?: number;
  // ...
}
```

Schema definition change:
```ts
// Remove:
encryptedPayload: { type: String },
// Add:
encryptedTitle: { type: String },
encryptedDescription: { type: String },
```

---

## Phase 2 — Crypto Service Changes

### 2.1 `crypto/services/payloadEncryption.service.ts`

Currently `encryptExpensePayload` returns `{ encryptedPayload, encryptionVersion }` where
`encryptedPayload` is a JSON string containing both amount and description.

**New signature:**
```ts
export async function encryptExpensePayload(
  payload: ExpensePayload,
  masterKey: CryptoKey,
): Promise<{
  encryptedAmount: string;
  encryptedDescription: string;
  encryptionVersion: number;
}>;
```

Implementation: encrypt `payload.amount` and `payload.description` separately, returning
two individual encrypted strings.

**New `decryptExpensePayload` signature:**
```ts
export async function decryptExpensePayload(
  expense: {
    encryptedAmount?: string | null;
    encryptedDescription?: string | null;
    amount?: number;
    description?: string;
  },
  masterKey: CryptoKey,
): Promise<{ amount: number; description: string }>;
```

Implementation: decrypt `expense.encryptedAmount` and `expense.encryptedDescription`
individually. Fall back to `expense.amount` / `expense.description` if the encrypted
fields don't exist (legacy data).

**Similarly for ExpenseBook:**
```ts
export async function encryptExpenseBookPayload(
  payload: ExpenseBookPayload,
  masterKey: CryptoKey,
): Promise<{
  encryptedTitle: string;
  encryptedDescription: string;
  encryptionVersion: number;
}>;

export async function decryptExpenseBookPayload(
  book: {
    encryptedTitle?: string | null;
    encryptedDescription?: string | null;
    title?: string;
    description?: string;
  },
  masterKey: CryptoKey,
): Promise<{ title: string; description: string }>;
```

---

### 2.2 `crypto/services/roomKey.service.ts`

Currently `encryptTicketPayload` returns a single JSON string.
**New signature:**
```ts
export async function encryptTicketPayload(
  payload: TicketPayload,
  roomKey: CryptoKey,
): Promise<{
  encryptedTitle: string;
  encryptedDescription: string;
}>;

export async function decryptTicketPayload(
  encryptedPayload: { encryptedTitle: string; encryptedDescription: string },
  roomKey: CryptoKey,
): Promise<TicketPayload>;
```

Implementation: encrypt `payload.title` → `encryptedTitle`, `payload.description` → `encryptedDescription`.

**For room name (keep same function names, update field usage):**
```ts
// encryptRoomName still returns a single encrypted string (one field = fine as-is)
// decryptRoomName still takes a single encrypted string
// Callers will read/write `room.encryptedName` instead of `room.encryptedPayload`
```

---

### 2.3 `lib/rooms/roomKeyDistribution.ts`

The server-side `encryptRoomName` function currently sets:
```ts
room.encryptedPayload = await encryptRoomName(room.name, rawKey);
```

**Change to:**
```ts
room.encryptedName = await encryptRoomName(room.name, rawKey);
```

---

## Phase 3 — API Route Changes

### 3.1 `app/api/expenses/route.ts` (POST)

In the expense creation handler:
```ts
const { amount, currency, category, description, date, bookId,
        encryptedAmount, encryptedDescription, encryptionVersion } = await req.json();
```

When building `expenseDoc`:
```ts
if (encryptedAmount) {
  expenseDoc.encryptedAmount = encryptedAmount;
  expenseDoc.encryptedDescription = encryptedDescription;
  expenseDoc.encryptionVersion = encryptionVersion ?? 1;
} else {
  expenseDoc.description = description;
}
```

### 3.2 `app/api/expenses/[id]/route.ts` (PUT)

Accept `encryptedAmount`, `encryptedDescription` instead of `encryptedPayload`:
```ts
const { amount, currency, category, description, date,
        encryptedAmount, encryptedDescription, encryptionVersion } = await req.json();
```

When building `updateFields`:
```ts
if (encryptedAmount) {
  updateFields.encryptedAmount = encryptedAmount;
  updateFields.encryptedDescription = encryptedDescription;
  updateFields.encryptionVersion = encryptionVersion ?? 1;
} else {
  updateFields.description = description !== undefined ? description : existingExpense.description;
}
```

### 3.3 `app/api/expense-books/route.ts` (POST)

```ts
const { title, description, currency, encryptedTitle, encryptedDescription, encryptionVersion } = await req.json();
```

When building `bookDoc`:
```ts
if (encryptedTitle) {
  bookDoc.encryptedTitle = encryptedTitle;
  bookDoc.encryptedDescription = encryptedDescription;
  bookDoc.encryptionVersion = encryptionVersion ?? 1;
} else {
  bookDoc.title = title;
  bookDoc.description = description;
}
```

### 3.4 `app/api/expense-books/[id]/route.ts` (PUT)

```ts
const { title, description, currency, encryptedTitle, encryptedDescription, encryptionVersion } = await req.json();
```

When building `updateFields`:
```ts
if (encryptedTitle) {
  updateFields.encryptedTitle = encryptedTitle;
  updateFields.encryptedDescription = encryptedDescription;
  updateFields.encryptionVersion = encryptionVersion ?? 1;
} else {
  if (title) updateFields.title = title.trim();
  if (description !== undefined) updateFields.description = description.trim();
}
```

### 3.5 `app/api/rooms/[roomId]/tickets/route.ts` (POST)

```ts
const { title, description, totalAmount, splitType, creatorId, involvedUsers, splitData,
        encryptedTitle, encryptedDescription } = body;
```

When building `ticketData`:
```ts
if (encryptedTitle) {
  ticketData.encryptedTitle = encryptedTitle;
  ticketData.encryptedDescription = encryptedDescription;
  ticketData.title = "";
  ticketData.description = null;
} else {
  ticketData.title = title?.trim();
  ticketData.description = description?.trim();
}
```

### 3.6 `app/api/rooms/[roomId]/tickets/[ticketId]/route.ts` (PUT)

```ts
const { title, description, totalAmount, splitType, involvedUsers, splitData, creatorId,
        encryptedTitle, encryptedDescription } = body;
```

When updating ticket:
```ts
if (encryptedTitle) {
  ticket.encryptedTitle = encryptedTitle;
  ticket.encryptedDescription = encryptedDescription;
  ticket.title = "";
  ticket.description = null;
} else {
  ticket.title = title?.trim() || ticket.title;
  ticket.description = description?.trim() ?? ticket.description;
}
```

---

## Phase 4 — Client Component Changes

### 4.1 `app/components/AddExpenseForm.tsx`

Currently after encryption:
```ts
body.encryptedPayload = encryptedPayload;
body.encryptionVersion = encryptionVersion;
```

**Change to:**
```ts
body.encryptedAmount = encryptedAmount;
body.encryptedDescription = encryptedDescription;
body.encryptionVersion = encryptionVersion;
```

### 4.2 `app/components/AddExpenseBookForm.tsx`

Currently after encryption:
```ts
body.encryptedPayload = encryptedPayload;
body.encryptionVersion = encryptionVersion;
```

**Change to:**
```ts
body.encryptedTitle = encryptedTitle;
body.encryptedDescription = encryptedDescription;
body.encryptionVersion = encryptionVersion;
```

### 4.3 `app/hooks/useExpenseDrawer.ts`

Currently after encryption:
```ts
updates.encryptedPayload = encryptedPayload;
updates.encryptionVersion = encryptionVersion;
```

**Change to:**
```ts
updates.encryptedAmount = encryptedAmount;
updates.encryptedDescription = encryptedDescription;
updates.encryptionVersion = encryptionVersion;
```

### 4.4 `app/components/rooms/AddTicketModal.tsx`

Currently after encryption:
```ts
body.encryptedPayload = encryptedPayload;
```

**Change to:**
```ts
body.encryptedTitle = encryptedTitle;
body.encryptedDescription = encryptedDescription;
```

### 4.5 `lib/rooms/roomKeyClient.ts`

Currently:
```ts
export async function getDecryptedRoomName(
  room: Pick<IRoom, "name" | "encryptedPayload" | "activeKeyVersion">,
  roomKey?: CryptoKey,
): Promise<string> {
  if (!room.encryptedPayload) return room.name;
```

**Change to:**
```ts
export async function getDecryptedRoomName(
  room: Pick<IRoom, "name" | "encryptedName" | "activeKeyVersion">,
  roomKey?: CryptoKey,
): Promise<string> {
  if (!room.encryptedName) return room.name;
```

### 4.6 No changes needed

These files use the decrypt functions which read whole objects — the new field names are
picked up automatically:
- `context/ExpenseContext.tsx` — calls `decryptExpensePayload(exp, mk)` which reads `exp.encryptedAmount`
- `app/components/ExpenseBookList.tsx` — calls `decryptExpenseBookPayload(book, mk)` which reads `book.encryptedTitle`
- `app/components/rooms/RoomTickets.tsx` — calls `decryptTicketPayload(ticket.encryptedPayload, key)` which needs payload shape update (but the new service returns `{ encryptedTitle, encryptedDescription }` so `ticket.encryptedPayload` no longer exists — **actually need to check this more carefully**)

**Correction for RoomTickets.tsx:** Since the ticket object now has `encryptedTitle`/`encryptedDescription` instead of `encryptedPayload`, the `decryptTicketPayload` function signature changes from taking a single string to taking the ticket object. Update:

```ts
// Before:
const payload = await decryptTicketPayload(ticket.encryptedPayload, key);
// After:
const payload = await decryptTicketPayload({
  encryptedTitle: ticket.encryptedTitle,
  encryptedDescription: ticket.encryptedDescription,
}, key);
```

---

## Phase 5 — Toggle UI Changes

### 5.1 `app/me/account/EncryptionStatusCard.tsx`

**Remove:**
- The `handleDisable` function
- The `<button onClick={handleDisable}>Disable</button>` JSX block
- The `disabling` state variable

**Modify `handleToggle`:**
- When `isEnabled` is true (ON) and user taps slider → show confirmation dialog: "Disable encryption? New data will be stored as plaintext." → on confirm, call `disable()`
- When `isEnabled` is false (OFF) → open setup modal (unchanged)

Updated `handleToggle`:
```ts
const handleToggle = async () => {
  if (!isEnabled) {
    setShowSetup(true);
  } else {
    if (!confirm("Disable encryption? New data will be stored as plaintext.")) return;
    setDisabling(true);
    const ok = await disable();
    setDisabling(false);
    if (ok) {
      showNotification("Encryption disabled.", "info");
      refreshStatus();
    } else {
      showNotification("Failed to disable encryption.", "error");
    }
  }
};
```

The slider JSX remains the same — it already exists as a single interactive element.

### 5.2 `app/page.tsx`

**Remove:**
```ts
import EncryptionLockSlot from "@/app/components/encryption/EncryptionLockSlot";
```
and its JSX usage.

### 5.3 `app/components/encryption/index.ts`

**Remove:**
```ts
export { default as EncryptionLockSlot } from "./EncryptionLockSlot";
```

### 5.4 `EncryptionLockSlot.tsx` file

The file can be left in place (no harm, just unused). Optionally delete.

---

## Phase 6 — Verification Checklist

| # | Check | Expected |
|---|-------|----------|
| 1 | MongoDB Expense documents | Have `encryptedAmount`, `encryptedDescription` fields, no `encryptedPayload` |
| 2 | MongoDB ExpenseBook documents | Have `encryptedTitle`, `encryptedDescription`, no `encryptedPayload` |
| 3 | MongoDB Room documents | Have `encryptedName`, no `encryptedPayload` |
| 4 | MongoDB RoomTicket documents | Have `encryptedTitle`, `encryptedDescription`, no `encryptedPayload` |
| 5 | Create expense with encryption ON | `encryptedAmount` and `encryptedDescription` stored, `description` is empty |
| 6 | Create expense with encryption OFF | `description` stored, no encrypted fields |
| 7 | Edit expense with encryption ON | `encryptedAmount` and `encryptedDescription` updated |
| 8 | Edit expense with encryption OFF | `description` updated, encrypted fields removed |
| 9 | Legacy expense without encrypted fields | Displays using `amount`/`description` fallback |
| 10 | Create expense book with encryption ON | `encryptedTitle` and `encryptedDescription` stored |
| 11 | Create room | Room name encrypted as `encryptedName` |
| 12 | Create room ticket with encryption ON | `encryptedTitle` and `encryptedDescription` stored |
| 13 | Account settings toggle ON | Opens setup modal |
| 14 | Account settings toggle OFF | Shows confirmation dialog, then disables encryption |
| 15 | No extra "Disable" button in account card | Only slider toggle present |
| 16 | Header has no lock icon | `EncryptionLockSlot` removed from `page.tsx` |
| 17 | Legacy data with old `encryptedPayload` | Falls back to plaintext fields via decrypt functions |

---

## Files Modified (Summary)

| # | File | Change Type |
|---|------|-------------|
| 1 | `models/Expense.ts` | Schema: replace `encryptedPayload` with `encryptedAmount`, `encryptedDescription` |
| 2 | `models/ExpenseBook.ts` | Schema: replace `encryptedPayload` with `encryptedTitle`, `encryptedDescription` |
| 3 | `models/Room.ts` | Schema: replace `encryptedPayload` with `encryptedName` |
| 4 | `models/RoomTicket.ts` | Schema: replace `encryptedPayload` with `encryptedTitle`, `encryptedDescription` |
| 5 | `crypto/services/payloadEncryption.service.ts` | Return/read individual fields |
| 6 | `crypto/services/roomKey.service.ts` | Return/read individual fields |
| 7 | `lib/rooms/roomKeyDistribution.ts` | Use `room.encryptedName` |
| 8 | `app/api/expenses/route.ts` | Accept individual encrypted fields |
| 9 | `app/api/expenses/[id]/route.ts` | Accept individual encrypted fields |
| 10 | `app/api/expense-books/route.ts` | Accept individual encrypted fields |
| 11 | `app/api/expense-books/[id]/route.ts` | Accept individual encrypted fields |
| 12 | `app/api/rooms/[roomId]/tickets/route.ts` | Accept individual encrypted fields |
| 13 | `app/api/rooms/[roomId]/tickets/[ticketId]/route.ts` | Accept individual encrypted fields |
| 14 | `app/components/AddExpenseForm.tsx` | Spread individual fields in request body |
| 15 | `app/components/AddExpenseBookForm.tsx` | Spread individual fields in request body |
| 16 | `app/hooks/useExpenseDrawer.ts` | Spread individual fields in request body |
| 17 | `app/components/rooms/AddTicketModal.tsx` | Spread individual fields in request body |
| 18 | `lib/rooms/roomKeyClient.ts` | Read `room.encryptedName` |
| 19 | `app/components/rooms/RoomTickets.tsx` | Read `ticket.encryptedTitle`/`encryptedDescription` |
| 20 | `app/me/account/EncryptionStatusCard.tsx` | Remove Disable button, update toggle behavior |
| 21 | `app/page.tsx` | Remove `EncryptionLockSlot` import and usage |
| 22 | `app/components/encryption/index.ts` | Remove `EncryptionLockSlot` from exports |

**Total: 22 files modified.**
