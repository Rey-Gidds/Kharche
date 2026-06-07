# Passphrase Recovery Implementation Phases

This document breaks down the implementation of the passphrase recovery feature into logical phases.

## Phase 1: Database Model & Core Cryptography Layer Updates
Goal: Prepare the database schema and add cryptographic functions to encrypt/decrypt the passphrase client-side.

- [x] **1.1 Update Mongoose Schema**:
  - File: [UserEncryption.ts](file:///C:/Users/REYANSH/OneDrive/Desktop/EXP_NEXT/expense_tracker/models/UserEncryption.ts)
  - Add `encryptedPassphrase?: string` as an optional field in `IUserEncryption` interface and Mongoose schema definition.
- [x] **1.2 Update Setup Encryption**:
  - File: [orchestrator.ts](file:///C:/Users/REYANSH/OneDrive/Desktop/EXP_NEXT/expense_tracker/crypto/services/orchestrator.ts)
  - Modify `setupEncryption(passphrase)` to encrypt the passphrase with the generated recovery key using AES-GCM and return it as `encryptedPassphrase` in `SetupResult`.
- [x] **1.3 Add Recover Passphrase Function**:
  - File: [orchestrator.ts](file:///C:/Users/REYANSH/OneDrive/Desktop/EXP_NEXT/expense_tracker/crypto/services/orchestrator.ts)
  - Implement `recoverPassphrase(recoveryKeyEncoded, encryptedPassphraseJson)` to import the recovery key, parse the encrypted passphrase JSON, and decrypt it.
- [x] **1.4 Export New Cryptographic Functions**:
  - File: [index.ts](file:///C:/Users/REYANSH/OneDrive/Desktop/EXP_NEXT/expense_tracker/crypto/index.ts)
  - Export `recoverPassphrase` from the crypto module.

## Phase 2: Backend API Endpoints
Goal: Support storage and retrieval of the encrypted passphrase envelope.

- [x] **2.1 Update Setup API**:
  - File: `app/api/user/encryption/setup/route.ts`
  - Accept, validate, and store `encryptedPassphrase` in the `UserEncryption` record.
- [x] **2.2 Update Keys API**:
  - File: `app/api/user/encryption/keys/route.ts`
  - Include `encryptedPassphrase` in the returned JSON response.

## Phase 3: Frontend Custom Hook (`useEncryption.ts`)
Goal: Connect API calls and handle the client-side recovery state hydration.

- [x] **3.1 Wire Passphrase Encryption into Setup**:
  - File: [useEncryption.ts](file:///C:/Users/REYANSH/OneDrive/Desktop/EXP_NEXT/expense_tracker/hooks/useEncryption.ts)
  - Modify the `setup(passphrase)` method to encrypt the passphrase using the recovery key and send it in the setup POST payload.
- [x] **3.2 Implement `recoverWithKey` Function**:
  - File: [useEncryption.ts](file:///C:/Users/REYANSH/OneDrive/Desktop/EXP_NEXT/expense_tracker/hooks/useEncryption.ts)
  - Implement `recoverWithKey(recoveryKey)`:
    1. Fetch keys from `/api/user/encryption/keys`.
    2. Decrypt the passphrase using `recoverPassphrase()`.
    3. Decrypt the master key using `unlockWithRecoveryKey()`.
    4. Decrypt the private key using the decrypted master key.
    5. Hydrate the in-memory keys and IndexedDB cache via `setUnlockedKeys`, `setInMemoryKeys`, and `storeDerivedKeys`.
    6. Return the recovered passphrase.

## Phase 4: UI Updates (Step-based Recovery Flow)
Goal: Provide users with a beautiful, user-friendly step-based recovery flow in the UI.

- [x] **4.1 Modify Unlock Modal**:
  - File: `app/components/encryption/EncryptionUnlockModal.tsx`
  - Convert the single-screen unlock modal to a state-based multi-step layout:
    - **Step 1: Passphrase entry** (adds a "Forgot passphrase?" trigger).
    - **Step 2: Recovery key entry** (with validation and trigger to run `recoverWithKey`).
    - **Step 3: Passphrase revealed** (displays recovered passphrase in plaintext with a copy button and a dashboard progression trigger).
    - **Alternate Step: Recovery Unavailable** (shows clean instructions for legacy users whose schema has no encrypted passphrase).
