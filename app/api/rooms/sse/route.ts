import { getSession } from "@/lib/session";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { roomEventBus, RoomEvent } from "@/lib/sse/roomEventBus";
import { flushPendingDbEvents } from "@/lib/sse/flushPendingDbEvents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getSession(await headers());
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(new TextEncoder().encode(`event: connected\ndata: {"userId":"${userId}"}\n\n`));

      // Subscribe to room events
      const unsubscribe = roomEventBus.subscribe(userId, (event: RoomEvent) => {
        const data = JSON.stringify(event);
        controller.enqueue(new TextEncoder().encode(`event: ${event.type}\ndata: ${data}\n\n`));
      });

      // Flush any events the user missed while offline (DB-backed, no in-memory cache needed)
      flushPendingDbEvents(userId, controller);

      // Heartbeat every 30s
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(":keepalive\n\n"));
        } catch {
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 30000);

      // Cleanup on disconnect
      const cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
      };

      // @ts-expect-error - ReadableStream controller has a closed promise in some runtimes
      if (controller.signal) {
        // @ts-expect-error
        controller.signal.addEventListener("abort", cleanup);
      }
    },
    cancel() {
      roomEventBus.unsubscribe(userId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
