# Encryption System — Bug Fix Documentation

> **Date**: 2026-06-03
> **Scope**: Fix 6 bugs across 11 files in the client-side E2E encryption system.
> **Architecture Doc**: `KHARCHE_ARCHITECTURE.md`
> **Design Docs**: `docs/passphrase-recovery-design.md`, `docs/encryption-schema-refactor.md`

---

## Key Hierarchy (Refresher)

```
Passphrase → PBKDF2 (SHA-512, 600K iterations) → Wrapping Key
                                                       ↓ AES-256-GCM
                                                  Master Key (AES-256)
                                                       ↓ AES-256-GCM
                                             Private Key (RSA-4096 JWK)

Recovery Key (256-bit random) → AES-256-GCM → Master Key (recovery path)
Recovery Key → AES-256-GCM → Passphrase (forgotten passphrase recovery)
```

---

## Bug 1: Dead `encryptedAmount` Code

### Severity
**Medium** — No data corruption (the field is silently ignored by Mongoose), but it's misleading, wastes bandwidth/storage, and the decrypt path has an impossible-to-reach branch that could confuse future developers.

### Root Cause

The `encryptExpensePayload` function encrypts the `amount` field into `encryptedAmount` and returns it. Both client callers (`AddExpenseForm.tsx`, `useExpenseDrawer.ts`) destructure this field and include it in the API request body. The server-side API routes (POST and PUT) store `encryptedAmount` on the Expense document.

However, **the server never reads `encryptedAmount`** — wallet balance calculations, threshold checks, and sorting all use the plaintext `amount` field. The user chose to keep amount as plaintext for server-side validation.

### Affected Files

| # | File | Lines | Change |
|---|------|-------|--------|
| 1 | `crypto/services/payloadEncryption.service.ts` | 8-65 | Remove `amount` from `ExpensePayload`, `encryptExpensePayload`, `decryptExpensePayload` |
| 2 | `app/api/expenses/route.ts` | 29, 49-51 | Remove `encryptedAmount` from destructure and conditional store |
| 3 | `app/api/expenses/[id]/route.ts` | 87, 105-106 | Remove `encryptedAmount` from destructure and conditional store |
| 4 | `app/hooks/useExpenseDrawer.ts` | 53, 55 | Remove `encryptedAmount` from destructure and update payload |
| 5 | `app/components/AddExpenseForm.tsx` | 110, 112 | Remove `encryptedAmount` from destructure and request body |
| 6 | `models/Expense.ts` | 12, 30 | Remove `encryptedAmount` from interface and schema |
| 7 | `context/ExpenseContext.tsx` | 18 | Update fallback check from `encryptedAmount` to `encryptedDescription` |

### Detailed Changes

#### 1a. `crypto/services/payloadEncryption.service.ts`

**`ExpensePayload` interface** — before:
```ts
export interface ExpensePayload {
  amount: number;
  description: string;
}
```

After — remove the `amount` field:
```ts
export interface ExpensePayload {
  description: string;
}
```

---

**`encryptExpensePayload`** — before:
```ts
export async function encryptExpensePayload(
  payload: ExpensePayload,
  masterKey: CryptoKey,
): Promise<{ encryptedAmount: string; encryptedDescription: string; encryptionVersion: number }> {
  try {
    const encryptedAmount = JSON.stringify(await encryptAesGcm(String(payload.amount), masterKey));
    const encryptedDescription = JSON.stringify(await encryptAesGcm(payload.description, masterKey));
    return {
      encryptedAmount,
      encryptedDescription,
      encryptionVersion: 1,
    };
  } catch (err) {
    throw new EncryptionError("Failed to encrypt expense payload", err);
  }
}
```

After — remove `encryptedAmount` encrypt and return:
```ts
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
```

---

**`decryptExpensePayload`** — before:
```ts
export async function decryptExpensePayload(
  expense: { encryptedAmount?: string | null; encryptedDescription?: string | null; amount?: number; description?: string },
  masterKey: CryptoKey,
): Promise<{ amount: number; description: string }> {
  if (!expense.encryptedAmount) {
    return {
      amount: expense.amount ?? 0,
      description: expense.description ?? "",
    };
  }
  try {
    const amountEncrypted: EncryptedData = JSON.parse(expense.encryptedAmount);
    const amountStr = await decryptAesGcm(amountEncrypted, masterKey);
    const descEncrypted: EncryptedData = JSON.parse(expense.encryptedDescription ?? "{}");
    const description = await decryptAesGcm(descEncrypted, masterKey);
    return { amount: Number(amountStr), description };
  } catch (err) {
    throw new DecryptionError("Failed to decrypt expense payload", err);
  }
}
```

After — remove `encryptedAmount` decrypt, return only `description`:
```ts
export async function decryptExpensePayload(
  expense: { encryptedDescription?: string | null; description?: string },
  masterKey: CryptoKey,
): Promise<{ description: string }> {
  if (!expense.encryptedDescription) {
    return { description: expense.description ?? "" };
  }
  try {
    const descEncrypted: EncryptedData = JSON.parse(expense.encryptedDescription);
    const description = await decryptAesGcm(descEncrypted, masterKey);
    return { description };
  } catch (err) {
    throw new DecryptionError("Failed to decrypt expense payload", err);
  }
}
```

---

#### 1b. `app/api/expenses/route.ts` — POST handler

Before — lines 29, 49-51:
```ts
const { amount, currency, category, description, date, bookId, encryptedAmount, encryptedDescription, encryptionVersion } = await req.json();
// ...
if (encryptedAmount) {
    expenseDoc.encryptedAmount = encryptedAmount;
    expenseDoc.encryptedDescription = encryptedDescription;
    expenseDoc.encryptionVersion = encryptionVersion ?? 1;
} else {
    expenseDoc.description = description;
}
```

After:
```ts
const { amount, currency, category, description, date, bookId, encryptedDescription, encryptionVersion } = await req.json();
// ...
if (encryptedDescription) {
    expenseDoc.encryptedDescription = encryptedDescription;
    expenseDoc.encryptionVersion = encryptionVersion ?? 1;
} else {
    expenseDoc.description = description;
}
```

Note: The `amount` is **always** stored as plaintext (line 62-63 in the function that builds `expenseDoc`). No changes needed there.

---

#### 1c. `app/api/expenses/[id]/route.ts` — PUT handler

Before — lines 87, 105-106:
```ts
const { amount, currency, category, description, date, encryptedAmount, encryptedDescription, encryptionVersion } = await req.json();
// ...
if (encryptedAmount) {
    updateFields.encryptedAmount = encryptedAmount;
    updateFields.encryptedDescription = encryptedDescription;
    updateFields.encryptionVersion = encryptionVersion ?? 1;
} else {
    updateFields.description = description !== undefined ? description : existingExpense.description;
}
```

After:
```ts
const { amount, currency, category, description, date, encryptedDescription, encryptionVersion } = await req.json();
// ...
if (encryptedDescription) {
    updateFields.encryptedDescription = encryptedDescription;
    updateFields.encryptionVersion = encryptionVersion ?? 1;
} else {
    updateFields.description = description !== undefined ? description : existingExpense.description;
}
```

---

#### 1d. `app/hooks/useExpenseDrawer.ts`

Before — lines 53-55:
```ts
const { encryptedAmount, encryptedDescription, encryptionVersion } = await encryptExpensePayload(
  { amount: editForm.amount, description: editForm.description ?? "" },
  masterKey,
);
updates.encryptedAmount = encryptedAmount;
updates.encryptedDescription = encryptedDescription;
updates.encryptionVersion = encryptionVersion;
```

After:
```ts
const { encryptedDescription, encryptionVersion } = await encryptExpensePayload(
  { description: editForm.description ?? "" },
  masterKey,
);
updates.encryptedDescription = encryptedDescription;
updates.encryptionVersion = encryptionVersion;
```

---

#### 1e. `app/components/AddExpenseForm.tsx`

Before — lines 110-112:
```ts
const { encryptedAmount, encryptedDescription, encryptionVersion } = await encryptExpensePayload(
  { amount: finalAmount, description },
  masterKey,
);
body.encryptedAmount = encryptedAmount;
body.encryptedDescription = encryptedDescription;
body.encryptionVersion = encryptionVersion;
```

After:
```ts
const { encryptedDescription, encryptionVersion } = await encryptExpensePayload(
  { description },
  masterKey,
);
body.encryptedDescription = encryptedDescription;
body.encryptionVersion = encryptionVersion;
```

---

#### 1f. `models/Expense.ts` (cleanup)

Before — lines 9-16 (interface), lines 28-32 (schema):
```ts
export interface IExpense extends Document {
  userId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  category: string;
  description?: string;
  date: Date;
  encryptedAmount?: string;       // ← remove
  encryptedDescription?: string;
  encryptionVersion: number;
  createdAt: Date;
  updatedAt: Date;
  bookId?: mongoose.Types.ObjectId;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    // ...
    encryptedAmount: { type: String },        // ← remove
    encryptedDescription: { type: String },
    encryptionVersion: { type: Number, default: 0 },
  },
);
```

After — remove `encryptedAmount` from both interface and schema:
```ts
export interface IExpense extends Document {
  userId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  category: string;
  description?: string;
  date: Date;
  encryptedDescription?: string;
  encryptionVersion: number;
  createdAt: Date;
  updatedAt: Date;
  bookId?: mongoose.Types.ObjectId;
}

// Schema: remove encryptedAmount line
```

---

#### 1g. `context/ExpenseContext.tsx`

Before — line 18:
```ts
if (!exp.encryptedAmount) return exp;
```

After — switch to `encryptedDescription`:
```ts
if (!exp.encryptedDescription) return exp;
```

---

## Bug 2: Re-Enable Banner Triggers 409 Error

### Severity
**High** — Users who disable encryption and visit the dashboard see a banner offering to "Enable encryption →" which opens the setup modal. Submitting the setup form calls `POST /api/user/encryption/setup` which returns **409 Conflict** because the `UserEncryption` record already exists (only `encryptionEnabled` was set to `false` on the User model).

### Root Cause

The `EncryptionOverlay` component checks `isEnabled` (which is `status.encryptionEnabled && status.setupCompleted`) to decide whether to show the banner. When a user disables encryption:
- `User.encryptionEnabled` → `false`
- `UserEncryption.setupCompleted` → still `true`

So `isEnabled` is `false`, and the banner renders. Clicking it opens `EncryptionSetupModal` which calls `setup()` → `POST /setup` → 409.

The `POST /enable` endpoint exists exactly for this scenario, but the banner doesn't know about it.

### Affected Files

| # | File | Lines | Change |
|---|------|-------|--------|
| 1 | `app/components/encryption/EncryptionOverlay.tsx` | ~41 | Add `!status?.setupCompleted` to banner condition |

### Detailed Change

#### `app/components/encryption/EncryptionOverlay.tsx`

Before:
```tsx
{initialized && !isEnabled && (
  <EncryptionBanner onSetup={handleSetupBanner} />
)}
```

After:
```tsx
{initialized && !isEnabled && !status?.setupCompleted && (
  <EncryptionBanner onSetup={handleSetupBanner} />
)}
```

**Logic**:
- `!isEnabled` → encryption is either disabled or not set up
- `!status?.setupCompleted` → the user has **never** completed setup (no `UserEncryption` record)

When both are true, the user is a first-time user who needs the setup wizard. When only `!isEnabled` is true but `setupCompleted` is true, the user previously completed setup but disabled — they should re-enable from the Account page, not through the banner.

---

## Bug 3: Recovery Key Flow Missing from Re-Enable Modal

### Severity
**High** — If a user disables encryption and later forgets their passphrase, the re-enable modal in the Account page only shows a passphrase input with no recovery option. The user is stuck — they cannot re-enable encryption.

The `EncryptionUnlockModal` (used on the dashboard unlock overlay) has a full recovery flow with "Forgot passphrase?" → recovery key input → passphrase reveal → unlock. But the re-enable modal in `EncryptionStatusCard` doesn't have this.

### Affected Files

| # | File | Lines | Change |
|---|------|-------|--------|
| 1 | `app/me/account/EncryptionStatusCard.tsx` | 1-191 | Add recovery key flow to re-enable modal |

### Detailed Change

#### `app/me/account/EncryptionStatusCard.tsx`

**Step 1: Import `recoverWithKey` from the hook**

Before:
```ts
const { status, isLoading, isEnabled, isUnlocked, lock, disable, enable, refreshStatus } = useEncryption();
```

After:
```ts
const { status, isLoading, isEnabled, isUnlocked, lock, disable, enable, recoverWithKey, refreshStatus } = useEncryption();
```

---

**Step 2: Add state for recovery flow**

After existing state declarations:
```tsx
const [showSetup, setShowSetup] = useState(false);
const [showReEnable, setShowReEnable] = useState(false);
const [reEnablePassphrase, setReEnablePassphrase] = useState("");
const [reEnableError, setReEnableError] = useState("");
const [reEnableLoading, setReEnableLoading] = useState(false);
```

Add:
```tsx
const [reEnableStep, setReEnableStep] = useState<"passphrase" | "recovery">("passphrase");
const [reEnableRecoveryKey, setReEnableRecoveryKey] = useState("");
```

---

**Step 3: Reset step state when modal closes**

After the form submission handlers, add a useEffect that resets the step on close:
```tsx
// Reset recovery step when modal closes
useEffect(() => {
  if (!showReEnable) {
    setReEnableStep("passphrase");
    setReEnableRecoveryKey("");
    setReEnableError("");
  }
}, [showReEnable]);
```

---

**Step 4: Add recovery key handler**

Define a handler for the recovery flow:
```tsx
const handleReEnableRecovery = async () => {
  setReEnableError("");
  setReEnableLoading(true);
  try {
    const result = await recoverWithKey(reEnableRecoveryKey.trim());
    if (result && result.passphrase) {
      // Chain: passphrase recovered → enable with it
      const res = await enable(result.passphrase);
      if (res === "ALREADY_CONFIGURED") {
        showNotification("Encryption re-enabled successfully.", "success");
        setShowReEnable(false);
        setReEnablePassphrase("");
      } else {
        setReEnableError("Failed to re-enable encryption after recovery.");
      }
    } else {
      setReEnableError("Invalid recovery key. Please check and try again.");
    }
  } catch (err: any) {
    setReEnableError(err?.message || "Recovery failed. Please check your recovery key.");
  } finally {
    setReEnableLoading(false);
  }
};
```

---

**Step 5: Modify the re-enable modal template**

The existing modal JSX is a `<form>` with:
1. Lock icon + heading
2. Error message (conditional)
3. Passphrase input
4. Enable button
5. Cancel button

Replace this with a two-step modal.

**When `reEnableStep === "passphrase"`** — same as current, but add a "Forgot passphrase?" link:

```tsx
{reEnableStep === "passphrase" && (
  <>
    <div className="w-12 h-12 rounded-full bg-[var(--border)] flex items-center justify-center mx-auto">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--muted)]">
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </div>

    <div className="text-center">
      <h2 className="text-lg font-playfair font-bold text-[var(--foreground)]">Re-enable Encryption</h2>
      <p className="text-sm text-[var(--muted)] mt-1">Enter your passphrase to re-enable encryption.</p>
    </div>

    {reEnableError && (
      <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 font-medium text-center">
        {reEnableError}
      </div>
    )}

    <form onSubmit={handleReEnableSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Passphrase</label>
        <input
          type="password"
          value={reEnablePassphrase}
          onChange={(e) => setReEnablePassphrase(e.target.value)}
          placeholder="Enter your current passphrase"
          className="w-full py-2.5 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none text-[var(--foreground)] font-medium"
          autoFocus
        />
      </div>

      <button
        type="submit"
        disabled={reEnableLoading || !reEnablePassphrase}
        className="w-full py-3 bg-[var(--accent)] text-[var(--background)] font-bold text-xs uppercase tracking-widest rounded-xl cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {reEnableLoading ? "Enabling..." : "Enable"}
      </button>

      {!reEnableLoading && (
        <button
          type="button"
          onClick={() => { setReEnableError(""); setReEnableStep("recovery"); }}
          className="w-full text-[11px] font-bold text-[var(--accent)] hover:opacity-80 cursor-pointer"
        >
          Forgot passphrase?
        </button>
      )}

      <button
        type="button"
        onClick={() => { setShowReEnable(false); setReEnablePassphrase(""); setReEnableError(""); }}
        className="w-full py-2 text-[11px] font-bold text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
      >
        Cancel
      </button>
    </form>
  </>
)}
```

**When `reEnableStep === "recovery"`** — recovery key input:

```tsx
{reEnableStep === "recovery" && (
  <>
    <div className="w-12 h-12 rounded-full bg-[var(--border)] flex items-center justify-center mx-auto">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--muted)]">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
    </div>

    <div className="text-center">
      <h2 className="text-lg font-playfair font-bold text-[var(--foreground)]">Recover Passphrase</h2>
      <p className="text-sm text-[var(--muted)] mt-1">Enter your recovery key to retrieve your passphrase and re-enable encryption.</p>
    </div>

    {reEnableError && (
      <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 font-medium text-center">
        {reEnableError}
      </div>
    )}

    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Recovery Key</label>
        <input
          type="text"
          value={reEnableRecoveryKey}
          onChange={(e) => setReEnableRecoveryKey(e.target.value)}
          placeholder="Enter your recovery key"
          className="w-full py-2.5 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none text-[var(--foreground)] font-medium"
          autoFocus
        />
      </div>

      <button
        type="button"
        onClick={handleReEnableRecovery}
        disabled={reEnableLoading || !reEnableRecoveryKey}
        className="w-full py-3 bg-[var(--accent)] text-[var(--background)] font-bold text-xs uppercase tracking-widest rounded-xl cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {reEnableLoading ? "Recovering..." : "Recover & Enable"}
      </button>

      <button
        type="button"
        onClick={() => { setReEnableError(""); setReEnableStep("passphrase"); }}
        className="w-full py-2 text-[11px] font-bold text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
      >
        ← Back to passphrase
      </button>
    </div>
  </>
)}
```

The existing modal `<div>` wrapper stays unchanged — it's already a `fixed inset-0 z-[100]` overlay with the backdrop and container. Only the inner content changes based on `reEnableStep`.

---

## Bug 4: Ciphertext Leaks to UI When Encryption Is Locked

### Severity
**Medium** — When encryption is enabled but locked (passphrase not entered), expenses with `encryptedDescription` contain raw ciphertext. The `decryptExpenses` function in `ExpenseContext` returns the raw expense data as-is when `getMasterKey()` is null. If any UI code renders the `description` field of an encrypted expense, it will show the base64url ciphertext string.

### Root Cause

`ExpenseContext.tsx` `decryptExpenses` callback:
```ts
const mk = getMasterKey();
if (!mk) return rawExpenses; // ← encrypted data passes through as-is
```

Expenses stored with encryption have `encryptedDescription` set to a JSON-stringified `EncryptedData` object, and `description` is either `undefined` or an empty string. The `encryptedDescription` is a JSON blob like `{"iv":"...","ciphertext":"...","tag":"...","algorithm":"AES-256-GCM"}` — this is what gets rendered if any component reads `exp.description` and it resolves to `encryptedDescription` through some fallback logic.

### Affected Files

| # | File | Lines | Change |
|---|------|-------|--------|
| 1 | `context/ExpenseContext.tsx` | ~16-20 | Sanitize encrypted data when locked |

### Detailed Change

#### `context/ExpenseContext.tsx`

Before:
```ts
const decryptExpenses = useCallback(async (rawExpenses: any[]): Promise<any[]> => {
    const mk = getMasterKey();
    if (!mk) return rawExpenses;
    return Promise.all(
      rawExpenses.map(async (exp) => {
        if (!exp.encryptedDescription) return exp;
        try {
          const decrypted = await decryptExpensePayload(exp, mk);
          return { ...exp, description: decrypted.description };
        } catch {
          return exp;
        }
      }),
    );
  }, []);
```

After:
```ts
const decryptExpenses = useCallback(async (rawExpenses: any[]): Promise<any[]> => {
    const mk = getMasterKey();
    if (!mk) {
      // Encryption is locked — sanitize encrypted fields with placeholders
      return rawExpenses.map(exp => {
        if (!exp.encryptedDescription) return exp;
        return {
          ...exp,
          description: "[Encrypted]",
          encryptedDescription: undefined,
        };
      });
    }
    return Promise.all(
      rawExpenses.map(async (exp) => {
        if (!exp.encryptedDescription) return exp;
        try {
          const decrypted = await decryptExpensePayload(exp, mk);
          return { ...exp, description: decrypted.description };
        } catch {
          return {
            ...exp,
            description: "[Decryption failed]",
            encryptedDescription: undefined,
          };
        }
      }),
    );
  }, []);
```

**Key behaviors**:
- **Locked**: Shows `"[Encrypted]"` placeholder, strips `encryptedDescription` so no UI code accidentally renders it
- **Decrypted**: Strips `encryptedDescription` after successful decryption, replaces `description` with plaintext
- **Decryption failure**: Shows `"[Decryption failed]"` placeholder, strips encrypted field
- **Plaintext expenses** (no `encryptedDescription`): Pass through unchanged (legacy data)

---

## Bug 5: Disable Route Lacks Guards

### Severity
**Low** — Idempotent call succeeds silently. No data corruption. But good practice to guard.

### Root Cause

`POST /api/user/encryption/disable` uses `findByIdAndUpdate` directly without checking if:
1. The user exists
2. Encryption is currently enabled

Also hardcodes `encryptionVersion: 0` instead of keeping the version (or ignoring it).

### Affected Files

| # | File | Lines | Change |
|---|------|-------|--------|
| 1 | `app/api/user/encryption/disable/route.ts` | 1-27 | Add user + already-disabled guards |

### Detailed Change

#### `app/api/user/encryption/disable/route.ts`

Before:
```ts
export async function POST() {
  try {
    const session = await getCachedSession(await headers());
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    await User.findByIdAndUpdate(session.user.id, {
      encryptionEnabled: false,
      encryptionVersion: 0,
    });

    return NextResponse.json({ message: "Encryption disabled" });
  } catch (error) {
    console.error("Encryption disable error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
```

After:
```ts
export async function POST() {
  try {
    const session = await getCachedSession(await headers());
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.encryptionEnabled) {
      return NextResponse.json({ message: "Encryption already disabled" });
    }

    user.encryptionEnabled = false;
    await user.save();

    return NextResponse.json({ message: "Encryption disabled" });
  } catch (error) {
    console.error("Encryption disable error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
```

**Changes explained**:
1. Find user first (instead of blind update) — returns 404 if not found
2. Check `encryptionEnabled` — returns early if already disabled (no-op success)
3. Use `user.save()` instead of `findByIdAndUpdate` — cleaner pattern, fires Mongoose hooks if any are added later
4. Removed hardcoded `encryptionVersion: 0` — the `UserEncryption` record already tracks the version, and the `User` model's version field is derived from it during re-enable

---

## Bug 6: `enable()` Takes Fresh-Setup Path When Status Hasn't Loaded

### Severity
**Medium** — If the user toggles encryption on the Account page before SWR finishes loading the status endpoint, `status` is `null`, making `status?.setupCompleted` evaluate to `undefined` (falsy). The `enable()` callback routes to the fresh-setup flow (`setupEncryption`) instead of the re-enable flow (passphrase -> fetch keys -> POST /enable).

If `setupEncryption` runs and the server returns 409 (UserEncryption record exists), the error message "Failed to save encryption keys" is shown to the user, which is confusing.

### Root Cause

`useEncryption.ts` — the `enable` callback:

```ts
const enable = useCallback(async (passphrase: string): Promise<string | null> => {
    // ...
    if (status?.setupCompleted) {
      // Re-enable path
    } else {
      // Fresh setup path ← taken when status is null
    }
}, [status?.setupCompleted, refreshStatus, session?.user?.id]);
```

Dependencies: `[status?.setupCompleted, refreshStatus, session?.user?.id]`

When `status` is `null`, `status?.setupCompleted` is `undefined`. The `undefined` value in the dependency array doesn't change when `status` loads with `{ setupCompleted: true }` — `undefined !== true`, so the callback IS recreated. But **until that re-render happens**, the stale closure with `status = null` runs the fresh-setup path.

### Affected Files

| # | File | Lines | Change |
|---|------|-------|--------|
| 1 | `hooks/useEncryption.ts` | `enable` callback, dependencies | Add `!status` guard, change deps |

### Detailed Change

#### `hooks/useEncryption.ts` — `enable` callback

Before:
```ts
const enable = useCallback(async (passphrase: string): Promise<string | null> => {
    setError(null);
    try {
      if (status?.setupCompleted) {
        // Re-enable existing encryption keys
        // ...
        return "ALREADY_CONFIGURED";
      }

      // Fresh setup flow
      // ... setupEncryption + POST /setup ...
      return result.recoveryKey;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to enable encryption";
      setError(msg);
      return null;
    }
  }, [status?.setupCompleted, refreshStatus, session?.user?.id]);
```

After:
```ts
const enable = useCallback(async (passphrase: string): Promise<string | null> => {
    setError(null);

    if (!status) {
      setError("Encryption status not loaded. Please wait and try again.");
      return null;
    }

    try {
      if (status.setupCompleted) {
        // Re-enable existing encryption keys
        // ...
        return "ALREADY_CONFIGURED";
      }

      // Fresh setup flow
      // ... setupEncryption + POST /setup ...
      return result.recoveryKey;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to enable encryption";
      setError(msg);
      return null;
    }
  }, [status, refreshStatus, session?.user?.id]);
```

**Changes**:
1. **Early guard**: `if (!status)` at the top — rejects with a clear message instead of silently routing to the wrong flow
2. **Dependency change**: `status?.setupCompleted` → `status` — this ensures the callback is correctly recreated when the full status object loads. Since React compares by reference and SWR returns new objects on revalidation, `status` changing from `null` to `{...}` will trigger the callback recreation

---

## File Change Summary

| # | Bug | File | Type of Change |
|---|-----|------|----------------|
| 1a | Dead `encryptedAmount` | `crypto/services/payloadEncryption.service.ts` | Remove amount from `ExpensePayload`, encrypt, decrypt |
| 1b | Dead `encryptedAmount` | `app/api/expenses/route.ts` | Remove `encryptedAmount` from POST handler |
| 1c | Dead `encryptedAmount` | `app/api/expenses/[id]/route.ts` | Remove `encryptedAmount` from PUT handler |
| 1d | Dead `encryptedAmount` | `app/hooks/useExpenseDrawer.ts` | Remove `encryptedAmount` destructure/assign |
| 1e | Dead `encryptedAmount` | `app/components/AddExpenseForm.tsx` | Remove `encryptedAmount` destructure/assign |
| 1f | Dead `encryptedAmount` | `models/Expense.ts` | Remove `encryptedAmount` from schema |
| 1g | Dead `encryptedAmount` | `context/ExpenseContext.tsx` | Switch fallback check to `encryptedDescription` |
| 2 | Re-enable banner 409 | `app/components/encryption/EncryptionOverlay.tsx` | Add `!status?.setupCompleted` check |
| 3 | Missing recovery in re-enable | `app/me/account/EncryptionStatusCard.tsx` | Add two-step recovery flow |
| 4 | Ciphertext when locked | `context/ExpenseContext.tsx` | Sanitize encrypted expenses with `"[Encrypted]"` |
| 5 | Disable route guards | `app/api/user/encryption/disable/route.ts` | Add user + already-disabled guards |
| 6 | Stale status in `enable()` | `hooks/useEncryption.ts` | Add `!status` guard, change dependency |

---

## Verification Checklist

### Pre-Fix Tests (Document Current Behavior)

| Test | Expected Before | Expected After |
|------|----------------|----------------|
| Create expense with encryption on | `encryptedAmount` stored in DB (never read) | No `encryptedAmount` in DB |
| API `POST /api/expenses` with encrypted payload | Destructures `encryptedAmount` silently | Only destructures `encryptedDescription` |
| `PUT /api/expenses/[id]` with encrypted payload | Destructures `encryptedAmount` silently | Only destructures `encryptedDescription` |
| Disable encryption → reload dashboard | Banner shows → setup modal → 409 | No banner |
| Disable → toggle re-enable | Only passphrase input | Passphrase input + "Forgot passphrase?" + recovery flow |
| Lock encryption → view expense list | Raw ciphertext possibly shown | Shows `"[Encrypted]"` |
| Call `POST /disable` twice | Succeeds silently | Returns `"Encryption already disabled"` (200) |
| Toggle encryption before SWR loads | Routes to fresh setup → 409 | Returns error: "status not loaded" |

### Post-Fix Tests

1. **Create encrypted expense**: `POST /api/expenses` with `encryptedDescription` set → confirm response has `encryptedDescription` but no `encryptedAmount` field
2. **Update encrypted expense**: `PUT /api/expenses/[id]` with `encryptedDescription` → confirm update works
3. **Re-enable banner**: Disable → refresh dashboard → confirm no encryption banner
4. **Re-enable with recovery**: Disable → toggle → "Forgot passphrase?" → recovery key → passphrase recovered → encryption re-enabled
5. **Locked view**: Lock encryption → view dashboard expenses → all descriptions show `"[Encrypted]"` or `"[Decryption failed]"`
6. **Double disable**: Call disable twice → second call returns 200 with `"Encryption already disabled"`
7. **Rapid toggle**: Navigate to Account page, immediately toggle → error shown, not fresh setup attempt

---

## Rollback Plan

If any fix causes unexpected behavior:

1. **Bug 1** (encryptedAmount): Revert `payloadEncryption.service.ts` first — this is the core. If data has been created without `encryptedAmount`, the `decryptExpensePayload` fallback `if (!encryptedDescription)` handles it gracefully.
2. **Bug 2** (banner): Simply revert the single line in `EncryptionOverlay.tsx`.
3. **Bug 3** (recovery modal): The new code is additive (wrapped in `reEnableStep === "recovery"` JSX blocks). Reverting means removing the state import, state declarations, handler, and JSX blocks — no side effects on existing functionality.
4. **Bug 4** (ciphertext): Revert the early return in `decryptExpenses` — the existing code path is preserved in the `else` branch.
5. **Bug 5** (disable route): Revert to the original `findByIdAndUpdate` pattern — no breaking changes.
6. **Bug 6** (stale status): Revert the guard and dependency array change — the original code still works when status is loaded (just lacks the guard).

---

## Design Decisions Record

| Decision | Rationale |
|----------|-----------|
| Amount stays as plaintext | Server needs it for wallet balance validation, threshold checks, and sorting |
| Banner hidden, not changed to "re-enable" | Account page already handles re-enable consistently; banner is for first-time users |
| Recovery in re-enable goes through `recoverWithKey` → `enable` chain | Reuses existing hook functions, avoids duplicating crypto logic |
| `[Encrypted]` placeholder when locked | Matches platform conventions (Signal, WhatsApp, ProtonMail) for encrypted-at-rest content |
| Disable route returns 200 for already-disabled | Idempotent — same as `DELETE` where resource doesn't exist |
| `enable()` rejects early if status is null | Prevents stale closure bug; user-friendly error message tells them to wait |
