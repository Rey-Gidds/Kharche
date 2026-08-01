import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import PushSubscription from "@/models/PushSubscription";

/** POST /api/push/subscribe
 * Authenticated. Upserts a push subscription for the current user.
 * Body: { endpoint: string, keys: { p256dh: string, auth: string }, userAgent?: string }
 */
export async function POST(req: Request) {
  await connectDB();
  const session = await getSession(await headers());
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { endpoint, keys, userAgent } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: "endpoint, keys.p256dh, and keys.auth are required" },
        { status: 400 }
      );
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        userId: session.user.id,
        endpoint,
        keys: { p256dh: keys.p256dh, auth: keys.auth },
        ...(userAgent ? { userAgent } : {}),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[push/subscribe] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
