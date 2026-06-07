"use client";

import { useState, useCallback, useEffect } from "react";
import useSWR from "swr";
import { setupEncryption, unlockWithPassphrase, unlockWithRecoveryKey, recoverPassphrase as orchestratorRecoverPassphrase, UnlockedKeys } from "@/crypto/services/orchestrator";
import { decryptAesGcm } from "@/crypto/services/aes.service";
import { EncryptedData } from "@/crypto/types";
import { getPublicKey } from "@/crypto/services/keyAccess";
import {
  lockKeys as cacheLockKeys,
  unlockKeys as cacheUnlockKeys,
  storeDerivedKeys,
  tryAutoUnlock,
} from "@/crypto/indexeddb/cacheManager";
import { useSession } from "@/lib/auth-client";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export interface EncryptionStatus {
  setupCompleted: boolean;
  needsBackfill: boolean;
  encryptionVersion: number;
}

export interface UseEncryptionReturn {
  status: EncryptionStatus | null;
  isLoading: boolean;
  isUnlocked: boolean;
  isEnabled: boolean;
  setupCompleted: boolean;
  needsBackfill: boolean;
  isAutoUnlocking: boolean;
  unlockedKeys: UnlockedKeys | null;
  error: string | null;
  setup: (passphrase: string) => Promise<string | null>;
  unlock: (passphrase: string) => Promise<boolean>;
  recoverWithKey: (recoveryKey: string) => Promise<{ passphrase: string; unlocked: boolean } | null>;
  refreshStatus: () => void;
  publicKey: string | null;
}

export function useEncryption(): UseEncryptionReturn {
  const { data: session } = useSession();
  const { data: status, error: statusError, mutate: refreshStatus } = useSWR<EncryptionStatus>(
    "/api/user/encryption/status",
    fetcher,
    { revalidateOnFocus: false },
  );

  const isEnabled = status?.setupCompleted ?? false;
  const [unlockedKeys, setUnlockedKeys] = useState<UnlockedKeys | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isAutoUnlocking, setIsAutoUnlocking] = useState(true);

  const setupCompleted = status?.setupCompleted ?? false;
  const needsBackfill = status?.needsBackfill ?? false;
  const isLoading = !status && !statusError;
  const isUnlocked = unlockedKeys !== null;

  const setup = useCallback(async (passphrase: string): Promise<string | null> => {
    setError(null);
    try {
      const result = await setupEncryption(passphrase);

      const res = await fetch("/api/user/encryption/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey: result.publicKey,
          encryptedPrivateKey: result.encryptedPrivateKey,
          encryptedMasterKey: result.encryptedMasterKey,
          salt: result.salt,
          recoveryKeyEnvelope: result.recoveryKeyEnvelope,
          encryptedPassphrase: result.encryptedPassphrase,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save encryption keys");
      }

      setPublicKey(result.publicKey);
      await refreshStatus();

      // Auto-unlock after setup — hydrate cacheManager's in-memory store
      const keys = await unlockWithPassphrase(
        passphrase,
        result.salt,
        result.encryptedMasterKey,
        result.encryptedPrivateKey,
      );
      setUnlockedKeys(keys);

      if (keys && session?.user?.id) {
        await cacheUnlockKeys(
          session.user.id,
          passphrase,
          result.encryptedMasterKey,
          result.encryptedPrivateKey,
          result.salt,
        );
        await storeDerivedKeys(session.user.id, keys.masterKey, keys.privateKey);
      }

      return result.recoveryKey;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Encryption setup failed";
      setError(msg);
      return null;
    }
  }, [refreshStatus, session?.user?.id]);

  const unlock = useCallback(async (passphrase: string): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch("/api/user/encryption/keys");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch encryption keys");
      }

      const data = await res.json();
      const keys = await unlockWithPassphrase(
        passphrase,
        data.salt,
        data.encryptedMasterKey,
        data.encryptedPrivateKey,
      );

      setUnlockedKeys(keys);
      setPublicKey(data.publicKey);

      if (keys && session?.user?.id) {
        await cacheUnlockKeys(
          session.user.id,
          passphrase,
          data.encryptedMasterKey,
          data.encryptedPrivateKey,
          data.salt,
        );
        await storeDerivedKeys(session.user.id, keys.masterKey, keys.privateKey);
      }

      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to unlock encryption";
      setError(msg);
      return false;
    }
  }, [session?.user?.id]);

  const recoverWithKey = useCallback(async (recoveryKey: string): Promise<{
    passphrase: string;
    unlocked: boolean;
  } | null> => {
    setError(null);
    try {
      const res = await fetch("/api/user/encryption/keys");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch encryption keys");
      }

      const data = await res.json();
      if (!data.encryptedPassphrase) {
        throw new Error("No encrypted passphrase found. This setup may not support recovery.");
      }

      const passphrase = await orchestratorRecoverPassphrase(
        recoveryKey,
        data.encryptedPassphrase,
      );

      const masterKey = await unlockWithRecoveryKey(recoveryKey, data.recoveryKeyEnvelope);

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

      setUnlockedKeys(keys);
      setPublicKey(data.publicKey);

      if (session?.user?.id) {
        await cacheUnlockKeys(
          session.user.id,
          passphrase,
          data.encryptedMasterKey,
          data.encryptedPrivateKey,
          data.salt,
        );
        await storeDerivedKeys(session.user.id, masterKey, privateKey);
      }

      return { passphrase, unlocked: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Recovery failed";
      setError(msg);
      return null;
    }
  }, [session?.user?.id]);

  // Fetch public key separately if unlocked
  useEffect(() => {
    if (setupCompleted && !publicKey) {
      getPublicKey().then(setPublicKey).catch(() => {});
    }
  }, [setupCompleted, publicKey]);

  // Auto-unlock on startup from cached derived keys
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || isLoading) return;

    if (!setupCompleted) {
      setIsAutoUnlocking(false);
      return;
    }

    if (isUnlocked) {
      setIsAutoUnlocking(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const keys = await tryAutoUnlock(userId);
        if (cancelled) return;

        if (keys) {
          setUnlockedKeys(keys);
        }
      } finally {
        if (!cancelled) setIsAutoUnlocking(false);
      }
    })();

    return () => { cancelled = true; };
  }, [session?.user?.id, isLoading, setupCompleted, isUnlocked]);

  return {
    status: status ?? null,
    isLoading: !status && !statusError,
    isEnabled,
    isUnlocked: unlockedKeys !== null,
    setupCompleted,
    needsBackfill,
    isAutoUnlocking,
    unlockedKeys,
    error: error ?? statusError?.message ?? null,
    setup,
    unlock,
    recoverWithKey,
    refreshStatus: () => { refreshStatus(); },
    publicKey,
  };
}
