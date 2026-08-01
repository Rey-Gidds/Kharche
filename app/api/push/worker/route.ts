import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import PushSubscription from "@/models/PushSubscription";
import { sendPushToSubscription } from "@/lib/webpush/sendPush";
import { buildPayload } from "@/lib/webpush/buildPayload";

/**
 * POST /api/push/worker
 *
 * Internal-only endpoint. Called fire-and-forget from the ticket creation handler.
 * Protected by the X-Internal-Secret header matching INTERNAL_WORKER_SECRET.
 *
 * Body: { notificationIds: string[] }
 *
 * For each notification ID:
 *  1. Load the Notification doc.
 *  2. Load all PushSubscription docs for the recipient.
 *  3. Send push to every subscription.
 *  4. On permanent failure (410/404): delete the stale subscription.
 *  5. Delete the notification record unconditionally (one attempt only).
 */
export async function POST(req: Request) {
  await connectDB();

  // ── Auth guard ─────────────────────────────────────────────────────────────
  const secret = req.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_WORKER_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { notificationIds } = body as { notificationIds: string[] };

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json({ error: "notificationIds array required" }, { status: 400 });
    }

    // Process each notification concurrently
    await Promise.allSettled(
      notificationIds.map(async (notifId) => {
        // 1. Load notification doc
        const notif = await Notification.findById(notifId).lean();
        if (!notif) return; // Already deleted or not found — skip

        try {
          // 2. Load all push subscriptions for this recipient
          const subs = await PushSubscription.find({
            userId: notif.recipientId,
          }).lean();

          // 3. Build payload once and send to all subscriptions
          const payload = buildPayload(notif);

          await Promise.allSettled(
            subs.map(async (sub) => {
              const result = await sendPushToSubscription(
                { endpoint: sub.endpoint, keys: sub.keys },
                payload
              );

              // 4. Permanent failure → delete stale subscription
              if (!result.success && result.permanent) {
                await PushSubscription.deleteOne({ _id: sub._id });
              }
            })
          );
        } finally {
          // 5. Unconditionally delete the notification record
          await Notification.deleteOne({ _id: notifId });
        }
      })
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[push/worker] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
