import webpush from "web-push";

let initialized = false;

/**
 * Initialises web-push with VAPID credentials from environment variables.
 * Safe to call multiple times — only runs once per process.
 */
export function initVapid(): void {
  if (initialized) return;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error(
      "Missing VAPID env vars: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT are all required."
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  initialized = true;
}
