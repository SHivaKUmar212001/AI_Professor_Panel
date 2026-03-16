import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { getSession } from "@/lib/discussion-engine";
import { authOptions } from "@/lib/auth";

function sseEvent(event: string, data: unknown, id: number): string {
  return `id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const lastEventId = parseInt(
    req.nextUrl.searchParams.get("lastEventId") ?? "-1",
    10
  );

  if (!sessionId) {
    return new Response("Missing sessionId", { status: 400 });
  }

  const engine = getSession(sessionId);
  if (!engine) {
    return new Response("Session not found", { status: 404 });
  }

  if (!engine.isOwnedBy(session.user.id)) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  let cancelStream = () => {};

  const stream = new ReadableStream({
    start(controller) {
      let isClosed = false;
      let heartbeat: ReturnType<typeof setInterval> | null = null;
      let unsubscribe = () => {};

      const close = () => {
        if (isClosed) {
          return;
        }

        isClosed = true;

        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }

        unsubscribe();

        try {
          controller.close();
        } catch {
          // Stream already closed.
        }
      };

      cancelStream = close;

      const send = (event: string, data: unknown, id: number) => {
        if (isClosed) {
          return;
        }

        try {
          controller.enqueue(encoder.encode(sseEvent(event, data, id)));
        } catch {
          close();
        }
      };

      unsubscribe = engine.subscribe((payload) => {
        send(payload.event, payload.data, payload.id);

        if (
          payload.event === "discussion_end" ||
          (payload.event === "error" && engine.getStatus() === "error")
        ) {
          close();
        }
      }, Number.isNaN(lastEventId) ? -1 : lastEventId);

      heartbeat = setInterval(() => {
        if (isClosed) {
          return;
        }

        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          close();
        }
      }, 15000);

      if (engine.getStatus() === "completed" || engine.getStatus() === "error") {
        close();
      }
    },
    cancel() {
      cancelStream();
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
