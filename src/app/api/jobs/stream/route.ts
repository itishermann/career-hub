import { getCurrentUser } from "@/server/auth-helpers";
import { jobEvents } from "@/server/jobs/events";
import { listJobs } from "@/server/jobs/queue";
import type { JobSummary } from "@/server/jobs/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const userId = user.id;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };
      const send = (data: unknown) =>
        safeEnqueue(`data: ${JSON.stringify(data)}\n\n`);

      // Initial snapshot of the user's jobs.
      void listJobs(userId).then((jobs) => send({ type: "snapshot", jobs }));

      const onUpdate = (summary: JobSummary) => {
        if (summary.userId === userId) send({ type: "update", job: summary });
      };
      jobEvents.on("job:update", onUpdate);

      const heartbeat = setInterval(() => safeEnqueue(": hb\n\n"), 15000);

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        jobEvents.off("job:update", onUpdate);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      req.signal.addEventListener("abort", close);
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
