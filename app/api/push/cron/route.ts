import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import PushSubscription from "@/models/PushSubscription";
import { sendPushToSubscription } from "@/lib/webpush/sendPush";
import { buildPayload } from "@/lib/webpush/buildPayload";

/**
 * POST /api/push/cron
 *
 * Cron-job endpoint. Finds ALL pending notifications, sends push for each,
 * and deletes them unconditionally. Protected by X-Internal-Secret.
 *
 * Returns: { processed: number, deleted: number, failed: number }
 */
export async function POST(req: Request) {
  await connectDB();

  const secret = req.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_WORKER_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const allNotifications = await Notification.find({}).lean();
    const total = allNotifications.length;

    if (total === 0) {
      return NextResponse.json({ processed: 0, deleted: 0, failed: 0 });
    }

    let failed = 0;

    await Promise.allSettled(
      allNotifications.map(async (notif) => {
        const notifId = notif._id;

        try {
          const subs = await PushSubscription.find({
            userId: notif.recipientId,
          }).lean();

          const payload = buildPayload(notif);

          await Promise.allSettled(
            subs.map(async (sub) => {
              const result = await sendPushToSubscription(
                { endpoint: sub.endpoint, keys: sub.keys },
                payload
              );
              if (!result.success && result.permanent) {
                await PushSubscription.deleteOne({ _id: sub._id });
              }
            })
          );
        } catch {
          failed++;
        } finally {
          await Notification.deleteOne({ _id: notifId });
        }
      })
    );

    return NextResponse.json({
      processed: total,
      deleted: total - failed,
      failed,
    });
  } catch (err: any) {
    console.error("[push/cron] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
