import webpush from "web-push";
import { initVapid } from "./vapid";

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface SendPushResult {
  success: boolean;
  /** true if the subscription endpoint is permanently gone (HTTP 410 / 404) */
  permanent: boolean;
}

/**
 * Sends a Web Push notification to a single subscription.
 *
 * Returns `{ success: false, permanent: true }` for HTTP 410/404 responses
 * (stale subscriptions that should be deleted from the DB).
 * Returns `{ success: false, permanent: false }` for transient errors.
 * Returns `{ success: true, permanent: false }` on success.
 */
export async function sendPushToSubscription(
  sub: PushSubscriptionData,
  payload: object
): Promise<SendPushResult> {
  initVapid();

  try {
    await webpush.sendNotification(sub, JSON.stringify(payload));
    return { success: true, permanent: false };
  } catch (err: any) {
    const statusCode: number | undefined = err?.statusCode;
    // 410 Gone = subscription expired/unsubscribed
    // 404 Not Found = endpoint no longer exists
    const permanent = statusCode === 410 || statusCode === 404;
    return { success: false, permanent };
  }
}
