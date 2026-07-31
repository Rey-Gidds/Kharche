import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import PushSubscription from "@/models/PushSubscription";

// Connect once on container start
await connectDB();

// Connect once on container start

/** DELETE /api/push/unsubscribe
 * Authenticated. Removes the push subscription matching the given endpoint
 * for the current user.
 * Body: { endpoint: string }
 */
export async function DELETE(req: Request) {
  const session = await getSession(await headers());
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
    }

    await PushSubscription.deleteOne({
      endpoint,
      userId: session.user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[push/unsubscribe] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
