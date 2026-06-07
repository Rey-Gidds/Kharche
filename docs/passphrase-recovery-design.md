# Passphrase Recovery Design

## Problem

Users set a passphrase during encryption setup. If they forget it, they're locked out of their encrypted data. The recovery key exists but currently only serves as a "bypass" — it decrypts the master key without revealing the original passphrase. This means the user can't re-enter their passphrase on another device or after the 24h auto-unlock cache expires — they'd need the recovery key again.

The purpose of a recovery key is to let the user **recover their passphrase**, not just bypass it temporarily.

## Current Key Hierarchy

```
Passphrase ──PBKDF2──→ Wrapping Key
                              │ AES-GCM
                              ▼
                        Master Key (AES-256)
                              │ AES-GCM
                              ▼
                        Private Key (RSA-4096)
Recovery Key ──AES-GCM──→ Master Key (recovery path)
```

The passphrase goes through PBKDF2 (one-way). There is no stored credential that can reverse this — `encryptedPassphrase` does not exist anywhere in the current schemas.

## Solution: Encrypted Passphrase Vault

Store the passphrase encrypted with the recovery key during setup. During recovery, decrypt it and display it to the user.

### Key Hierarchy (updated)

```
Passphrase ──PBKDF2──→ Wrapping Key
         \             │ AES-GCM
          \            ▼
           \      Master Key (AES-256)
            \           │ AES-GCM
             \          ▼
              \    Private Key (RSA-4096)
               \
                \──AES-GCM──→ encryptedPassphrase  ← NEW
                    ↑
              Recovery Key ──AES-GCM──→ Master Key (recovery path)
                              │ AES-GCM
                              ▼
                        decryptedPassphrase  ← revealed to user
```

### What changes in each layer

---

## 1. Mongoose Schema — `models/UserEncryption.ts`

Add one optional field:

```typescript
export interface IUserEncryption extends Document {
  userId: mongoose.Types.ObjectId;
  publicKey: string;
  encryptedPrivateKey: string;
  encryptedMasterKey: string;
  salt: string;
  recoveryKeyEnvelope: string;
  encryptedPassphrase?: string;    // NEW — EncryptedData JSON, AES-GCM with recovery key
  encryptionVersion: number;
  setupCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

Schema definition addition:
```typescript
encryptedPassphrase: { type: String },
```

This is **optional** — users who already have encryption set up won't have it. The field is populated only on new setups (or an optional backfill migration later).

---

## 2. Crypto — `crypto/services/orchestrator.ts`

### `setupEncryption()` — encrypt passphrase with recovery key

After the existing recovery key envelope generation, add:

```typescript
// 7. Encrypt the original passphrase with the recovery key
const encryptedPassphraseData = await encryptAesGcm(passphrase, recoveryKey);
```

Add to return type:

```typescript
export interface SetupResult {
  publicKey: string;
  encryptedMasterKey: string;
  salt: string;
  encryptedPrivateKey: string;
  recoveryKeyEnvelope: string;
  encryptedPassphrase: string;    // NEW
  recoveryKey: string;
}
```

### `recoverPassphrase()` — new exported function

```typescript
/**
 * Decrypt the stored passphrase using the recovery key.
 * Called when the user enters their recovery key during recovery flow.
 *
 * @param recoveryKeyEncoded  Base64url-encoded 256-bit recovery key
 * @param encryptedPassphraseJson  JSON-stringified EncryptedData from the server
 * @returns The original passphrase as a plaintext string
 */
export async function recoverPassphrase(
  recoveryKeyEncoded: string,
  encryptedPassphraseJson: string,
): Promise<string> {
  const recoveryKey = await importRecoveryKey(recoveryKeyEncoded);
  const encryptedData: EncryptedData = JSON.parse(encryptedPassphraseJson);
  return decryptAesGcm(encryptedData, recoveryKey);
}
```

### `unlockWithRecoveryKey()` — unchanged

Returns the master key (existing flow). This is used to hydrate the session after recovery so the user is immediately unlocked.

---

## 3. Server — Setup API `app/api/user/encryption/setup/route.ts`

### Accept `encryptedPassphrase` in POST body

```typescript
const { publicKey, encryptedPrivateKey, encryptedMasterKey, salt, recoveryKeyEnvelope, encryptedPassphrase } = await request.json();

// Validation
if (!publicKey || !encryptedPrivateKey || !encryptedMasterKey || !salt || !recoveryKeyEnvelope || !encryptedPassphrase) {
  return NextResponse.json({ error: "Missing required encryption fields" }, { status: 400 });
}

// Store
const encRecord = await UserEncryption.create({
  userId: user._id,
  publicKey,
  encryptedPrivateKey,
  encryptedMasterKey,
  salt,
  recoveryKeyEnvelope,
  encryptedPassphrase,   // NEW
  encryptionVersion: 1,
  setupCompleted: true,
});
```

### Return `encryptedPassphrase` in keys endpoint `GET /api/user/encryption/keys`

```typescript
return NextResponse.json({
  publicKey: encRecord.publicKey,
  encryptedPrivateKey: encRecord.encryptedPrivateKey,
  encryptedMasterKey: encRecord.encryptedMasterKey,
  salt: encRecord.salt,
  recoveryKeyEnvelope: encRecord.recoveryKeyEnvelope,
  encryptedPassphrase: encRecord.encryptedPassphrase,   // NEW
  encryptionVersion: encRecord.encryptionVersion,
});
```

---

## 4. Hook — `hooks/useEncryption.ts`

### Add `recoverWithKey()` function

```typescript
export interface UseEncryptionReturn {
  // ... existing fields
  recoverWithKey: (recoveryKey: string) => Promise<{
    passphrase: string;
    unlocked: boolean;
  } | null>;   // NEW
}
```

Implementation:

```typescript
const recoverWithKey = useCallback(async (recoveryKey: string): Promise<{
  passphrase: string;
  unlocked: boolean;
} | null> => {
  setError(null);
  try {
    // 1. Fetch keys from server (includes encryptedPassphrase + recoveryKeyEnvelope)
    const res = await fetch("/api/user/encryption/keys");
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to fetch encryption keys");
    }

    const data = await res.json();
    if (!data.encryptedPassphrase) {
      throw new Error("No encrypted passphrase found. This setup may not support recovery.");
    }

    // 2. Decrypt the passphrase using the recovery key
    const passphrase = await orchestratorRecoverPassphrase(
      recoveryKey,
      data.encryptedPassphrase,
    );

    // 3. Decrypt master key using recovery key (for session unlock)
    const masterKey = await unlockWithRecoveryKey(recoveryKey, data.recoveryKeyEnvelope);

    // 4. Decrypt private key using the recovered master key
    const encryptedPrivateKeyData: EncryptedData = JSON.parse(data.encryptedPrivateKey);
    const privateKeyJwkJson = await decryptAesGcm(encryptedPrivateKeyData, masterKey);
    const privateKeyJwk: JsonWebKey = JSON.parse(privateKeyJwkJson);
    const privateKey = await crypto.subtle.importKey(
      "jwk",
      privateKeyJwk,
      { name: "RSA-OAEP", hash: "SHA-256" },
      true,
      ["decrypt"],
    );

    const keys: UnlockedKeys = { masterKey, privateKey };

    // 5. Hydrate cacheManager
    setUnlockedKeys(keys);
    setPublicKey(data.publicKey);

    if (session?.user?.id) {
      setInMemoryKeys(masterKey, privateKey, session.user.id);
      await storeDerivedKeys(session.user.id, masterKey, privateKey);
    }

    // 6. Return passphrase + success state
    return { passphrase, unlocked: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Recovery failed";
    setError(msg);
    return null;
  }
}, [session?.user?.id]);
```

### Wire into return type

```typescript
return {
  // ... existing
  recoverWithKey,
};
```

---

## 5. UI — Unlock Modal `EncryptionUnlockModal.tsx`

### Add step-based flow

Current state: single screen with passphrase input + "Unlock" button.

New state: two-step flow within the same modal. The modal is renamed or extended to handle both steps internally.

#### Step 1: Passphrase entry (existing, with additions)

```
┌──────────────────────────────┐
│       🔒 Unlock Encryption   │
│                               │
│  Enter your passphrase to     │
│  access encrypted data.       │
│                               │
│  ┌─────────────────────────┐  │
│  │ Passphrase              │  │
│  │ [••••••••••••••••]     │  │
│  └─────────────────────────┘  │
│                               │
│  ┌─────────────────────────┐  │
│  │        Unlock           │  │
│  └─────────────────────────┘  │
│                               │
│  Forgot passphrase?  ←─── NEW │
│                               │
│  Skip — use without encryption│
└──────────────────────────────┘
```

#### Step 2: Recovery key entry (NEW)

When user clicks "Forgot passphrase?", transition to recovery step:

```
┌──────────────────────────────┐
│    🔐 Recover Passphrase     │
│                               │
│  Enter your recovery key to   │
│  retrieve your passphrase.    │
│                               │
│  ┌─────────────────────────┐  │
│  │ Recovery Key            │  │
│  │ [____________________] │  │
│  └─────────────────────────┘  │
│                               │
│  ┌─────────────────────────┐  │
│  │     Recover & Unlock    │  │
│  └─────────────────────────┘  │
│                               │
│  ← Back to passphrase login   │
└──────────────────────────────┘
```

#### Step 3: Passphrase revealed (NEW)

After successful recovery:

```
┌──────────────────────────────┐
│    ✅ Passphrase Recovered   │
│                               │
│  Your passphrase has been     │
│  recovered. Please save it.   │
│                               │
│  ┌─────────────────────────┐  │
│  │ Your Passphrase         │  │
│  │                         │  │
│  │ [mySecurePassphrase123] │  │
│  │                         │  │
│  │   [Copy to clipboard]   │  │
│  └─────────────────────────┘  │
│                               │
│  ⚠ This is the only time      │
│  your passphrase will be      │
│  shown. Store it safely.      │
│                               │
│  ┌─────────────────────────┐  │
│  │   Continue to Dashboard │  │
│  └─────────────────────────┘  │
└──────────────────────────────┘
```

Key behaviors for Step 3:
- Passphrase is displayed in plaintext (not masked)
- Copy to clipboard button
- A strong warning that this is the only time the passphrase is shown
- "Continue to Dashboard" dismisses the modal and the user is unlocked (keys hydrated in step 2)
- No "set a new passphrase" prompt — the user now knows their original passphrase
- The passphrase is never shown again by the application (stays encrypted on server)

### Implementation approach

Since you said "same modal, step-based flow," the `EncryptionUnlockModal` component gets a `step` state:

```typescript
type UnlockStep = "passphrase" | "recovery" | "reveal";

const [step, setStep] = useState<UnlockStep>("passphrase");
const [recoveryKey, setRecoveryKey] = useState("");
const [recoveredPassphrase, setRecoveredPassphrase] = useState("");
```

### Transitions

| Trigger | From → To |
|---------|-----------|
| User clicks "Forgot passphrase?" | passphrase → recovery |
| User clicks "Back to passphrase login" | recovery → passphrase |
| Recovery succeeds | recovery → reveal |
| User clicks "Continue to Dashboard" | reveal → (modal closes) |

### Error handling for recovery

If `encryptedPassphrase` is missing from the server response (legacy setup without the field):

```
┌──────────────────────────────┐
│    ⚠ Recovery Unavailable   │
│                               │
│  Your encryption setup was    │
│  created before passphrase    │
│  recovery was supported.      │
│                               │
│  To regain access:             │
│  1. Disable encryption in     │
│     Account Settings          │
│  2. Re-enable it to generate  │
│     a recovery key            │
│                               │
│  ┌─────────────────────────┐  │
│  │      Go Back            │  │
│  └─────────────────────────┘  │
└──────────────────────────────┘
```

---

## 6. UI — Setup Modal `EncryptionSetupModal.tsx`

### Add passphrase encryption to the create step

When the user submits the form and setup succeeds, the `setup()` function already returns the recovery key string. The `useEncryption` hook's `setup()` function needs to encrypt the passphrase with the recovery key before sending to the server.

The flow within `useEncryption.setup()`:

```typescript
// existing steps 1-6...
// 7. Encrypt the original passphrase with the recovery key
const encryptedPassphraseData = await encryptAesGcm(passphrase, recoveryKey);
const encryptedPassphrase = JSON.stringify(encryptedPassphraseData);

// Include in the API call
const res = await fetch("/api/user/encryption/setup", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    publicKey: result.publicKey,
    encryptedPrivateKey: result.encryptedPrivateKey,
    encryptedMasterKey: result.encryptedMasterKey,
    salt: result.salt,
    recoveryKeyEnvelope: result.recoveryKeyEnvelope,
    encryptedPassphrase,   // NEW
  }),
});
```

No UI changes needed in the setup modal itself — the passphrase encryption is transparent.

---

## 7. Backward Compatibility

### Scenario 1: Existing user with encryption enabled (no `encryptedPassphrase`)

- `GET /api/user/encryption/keys` returns `encryptedPassphrase: undefined`
- `recoverWithKey()` checks for this and returns `null` with error message
- Unlock modal shows "Recovery Unavailable" state with guidance
- User can disable + re-enable encryption to generate the new encrypted passphrase

### Scenario 2: Legacy unlock (with passphrase, no recovery needed)

- Unchanged. Passphrase → PBKDF2 → unlock flow works identically.

### Scenario 3: Auto-unlock (24h cache)

- Unchanged. Derived keys cached in IndexedDB allow passphrase-free access.

### Scenario 4: Cross-device access

- User must know their passphrase (or use recovery key on each device).
- The encrypted passphrase is stored on the server, so recovery key works on any device.

---

## 8. Security Considerations

| Concern | Mitigation |
|---------|------------|
| Passphrase stored on server (even encrypted) | Encrypted with recovery key (256-bit AES-GCM). The server never has the recovery key. This is equivalent to how password managers store encrypted vaults. |
| Recovery key + encrypted passphrase both leaked | Both would need to be compromised. The recovery key is client-side only — never stored on server. |
| Recovery key shown once during setup | User is forced to copy/download it. No persistent storage of plaintext recovery key anywhere. |
| Passphrase revealed on recovery screen | Passphrase is shown in plaintext but only once. Modal advises user to memorize or store it. No API to retrieve passphrase exists — only the recovery flow uses it. |
| Replay attack on recovery API | Recovery uses the same session-based auth as all other endpoints. No new attack surface. |

---

## 9. Files Changed Summary

| # | File | Change |
|---|------|--------|
| 1 | `models/UserEncryption.ts` | Add `encryptedPassphrase?: string` field |
| 2 | `crypto/services/orchestrator.ts` | Encrypt passphrase in `setupEncryption()`, add `recoverPassphrase()` export |
| 3 | `crypto/index.ts` | Export `recoverPassphrase` |
| 4 | `app/api/user/encryption/setup/route.ts` | Accept `encryptedPassphrase` in body, validate, store |
| 5 | `app/api/user/encryption/keys/route.ts` | Include `encryptedPassphrase` in response |
| 6 | `hooks/useEncryption.ts` | Add `recoverWithKey()` function, wire encrypted passphrase into `setup()` |
| 7 | `app/components/encryption/EncryptionUnlockModal.tsx` | Convert to 3-step flow (passphrase / recovery / reveal) |
| 8 | `app/components/encryption/index.ts` | Export any new components if needed |

---

## 10. Complete Recovery Flow (End to End)

```
Setup:
  User enters passphrase → PBKDF2 wrapping key → AES master key → RSA key pair
  Recovery key generated → encrypts master key → recoveryKeyEnvelope
  Recovery key also encrypts passphrase → encryptedPassphrase
  All sent to server → UserEncryption document created

Recovery:
  User sees unlock modal → enters wrong passphrase → clicks "Forgot passphrase?"
  Step 1: [Forgot passphrase?] → recovery step
  Step 2: [Enter recovery key] → pastes recovery key → "Recover & Unlock"
  Step 3: [Passphrase revealed] → sees original passphrase in plaintext
  Behind the scenes:
    - recoverPassphrase(recoveryKey, encryptedPassphrase) → original passphrase string
    - unlockWithRecoveryKey(recoveryKey, recoveryKeyEnvelope) → master key
    - decrypt private key with master key
    - storeDerivedKeys() → 24h auto-unlock cache
    - setInMemoryKeys() → cacheManager ready for payload encryption
  User: copies passphrase → clicks "Continue to Dashboard" → unlocked
```
