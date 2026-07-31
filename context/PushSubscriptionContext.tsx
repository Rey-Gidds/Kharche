"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useAuth } from "@/hooks/useAuth";

type PermissionState = "granted" | "denied" | "default" | "unsupported";

interface PushSubscriptionContextType {
  permission: PermissionState;
  isSubscribed: boolean;
  requestPermission: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

const PushSubscriptionContext = createContext<PushSubscriptionContextType | undefined>(undefined);

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** Converts a base64url VAPID public key to a Uint8Array for pushManager.subscribe */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buf = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buf);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushSubscriptionProvider({ children }: { children: ReactNode }) {
  const { authenticated, loading: authLoading } = useAuth();

  const [permission, setPermission] = useState<PermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check if push is supported at all
  const isPushSupported =
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  // On mount: sync permission state and check existing subscription
  useEffect(() => {
    if (!isPushSupported) {
      setPermission("unsupported");
      return;
    }

    // Sync Notification.permission state
    setPermission(Notification.permission as PermissionState);

    // Wait for SW to be ready, then check for an existing subscription
    navigator.serviceWorker.ready.then((reg) => {
      setRegistration(reg);
      return reg.pushManager.getSubscription();
    }).then((sub) => {
      setIsSubscribed(!!sub);
    }).catch(console.error);
  }, [isPushSupported]);

  /**
   * Subscribes the user to push notifications.
   * Called automatically if permission is already "granted" and user is authenticated,
   * or explicitly via requestPermission().
   */
  const subscribe = useCallback(async (reg: ServiceWorkerRegistration) => {
    if (!VAPID_PUBLIC_KEY) {
      console.error("[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set.");
      return;
    }
    try {
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subJson = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
          userAgent: navigator.userAgent,
        }),
      });

      setIsSubscribed(true);
    } catch (err) {
      console.error("[Push] subscribe failed:", err);
    }
  }, []);

  // Auto-subscribe when: user is authenticated + permission already granted + SW ready
  useEffect(() => {
    if (authLoading || !authenticated || !isPushSupported) return;
    if (Notification.permission !== "granted") return;

    navigator.serviceWorker.ready
      .then((reg) => {
        setRegistration(reg);
        return reg.pushManager.getSubscription().then((existing) => {
          if (!existing) {
            // Permission already granted, but no subscription yet — re-subscribe
            return subscribe(reg);
          }
          setIsSubscribed(true);
        });
      })
      .catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, authLoading, isPushSupported]);

  /** Prompt for permission and subscribe. Exposed for UI-triggered calls. */
  const requestPermission = useCallback(async () => {
    if (!isPushSupported || !authenticated) return;

    const result = await Notification.requestPermission();
    setPermission(result as PermissionState);

    if (result !== "granted") return;

    const reg = registration ?? (await navigator.serviceWorker.ready);
    if (!registration) setRegistration(reg);
    await subscribe(reg);
  }, [isPushSupported, authenticated, registration, subscribe]);

  /** Unsubscribes from push and cleans up the subscription on the server. */
  const unsubscribe = useCallback(async () => {
    if (!isPushSupported) return;

    try {
      const reg = registration ?? (await navigator.serviceWorker.ready);
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;

      const endpoint = sub.endpoint;
      await sub.unsubscribe();

      await fetch("/api/push/unsubscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });

      setIsSubscribed(false);
    } catch (err) {
      console.error("[Push] unsubscribe failed:", err);
    }
  }, [isPushSupported, registration]);

  return (
    <PushSubscriptionContext.Provider
      value={{ permission, isSubscribed, requestPermission, unsubscribe }}
    >
      {children}
    </PushSubscriptionContext.Provider>
  );
}

export function usePushSubscription() {
  const ctx = useContext(PushSubscriptionContext);
  if (!ctx) {
    throw new Error("usePushSubscription must be used within a PushSubscriptionProvider");
  }
  return ctx;
}
