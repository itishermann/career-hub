// Runs once when the Next.js server process boots. We start the in-process job
// worker here. Guarded to the Node.js runtime (not Edge) and to a single start.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startWorker } = await import("@/server/jobs/worker");
  startWorker();
}
