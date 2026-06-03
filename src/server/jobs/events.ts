import { EventEmitter } from "node:events";
import type { JobSummary } from "./types";

// Single in-process bus shared by the worker (emitter) and SSE routes
// (subscribers). Because the worker runs in the same Node process as the web
// server (instrumentation.ts), no external broker is needed.
//
// A module-level singleton survives hot-reload in dev via globalThis.
const globalForJobEvents = globalThis as unknown as {
  __jobEvents?: JobEventBus;
};

type JobEventBus = EventEmitter & {
  emitJobUpdate: (summary: JobSummary) => void;
  emitWake: () => void;
};

function createBus(): JobEventBus {
  const bus = new EventEmitter() as JobEventBus;
  // One SSE listener per open browser tab — lift the default cap of 10.
  bus.setMaxListeners(0);
  bus.emitJobUpdate = (summary) => bus.emit("job:update", summary);
  bus.emitWake = () => bus.emit("wake");
  return bus;
}

export const jobEvents: JobEventBus =
  globalForJobEvents.__jobEvents ?? createBus();

if (!globalForJobEvents.__jobEvents) {
  globalForJobEvents.__jobEvents = jobEvents;
}
