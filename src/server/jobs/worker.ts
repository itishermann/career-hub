import { db } from "@/server/db";
import { loggerFor } from "@/server/logger";
import { reportError } from "@/server/observability/report-error";
import { jobEvents } from "./events";
import { runAtsScoring } from "./handlers/ats";
import type { JobContext, JobUser } from "./handlers/context";
import { runCvGeneration } from "./handlers/cv";
import { runCvImprovement } from "./handlers/cv-improvement";
import { runFactExtraction } from "./handlers/fact-extraction";
import { runLmGeneration } from "./handlers/lm";
import { runTranslation } from "./handlers/translation";
import {
  claimNextJob,
  completeJob,
  failOrRequeueJob,
  isCancelRequested,
  markCancelled,
  recoverOrphans,
  reportProgress,
} from "./queue";
import { JobCancelledError, type JobType, parseJobPayload } from "./types";

const log = loggerFor("jobs");

const POLL_INTERVAL_MS = Number.parseInt(
  process.env.JOB_POLL_INTERVAL_MS ?? "2000",
  10,
);

let started = false;
let draining = false;

export function startWorker(): void {
  if (started) return;
  started = true;
  log.info("worker starting");
  recoverOrphans()
    .catch((e) => reportError(e, { scope: "jobs" }, "orphan recovery failed"))
    .finally(() => void drain());
  jobEvents.on("wake", () => void drain());
  setInterval(() => void drain(), POLL_INTERVAL_MS);
}

// Concurrency 1: only one drain loop runs at a time.
async function drain(): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    let job = await claimNextJob();
    while (job) {
      await processJob(job);
      job = await claimNextJob();
    }
  } catch (e) {
    reportError(e, { scope: "jobs" }, "drain loop error");
  } finally {
    draining = false;
  }
}

async function loadUser(userId: string): Promise<JobUser> {
  const u = await db.user.findUniqueOrThrow({ where: { id: userId } });
  return { id: u.id, name: u.name, email: u.email, llmConfig: u.llmConfig };
}

async function processJob(job: {
  id: string;
  userId: string;
  type: string;
  payload: unknown;
  attempts: number;
  maxAttempts: number;
}): Promise<void> {
  const ctx: JobContext = {
    jobId: job.id,
    reportProgress: (step, progress) => reportProgress(job.id, step, progress),
    throwIfCancelled: async () => {
      if (await isCancelRequested(job.id)) throw new JobCancelledError();
    },
  };
  try {
    const user = await loadUser(job.userId);
    const type = job.type as JobType;
    const payload = parseJobPayload(type, job.payload);
    let result: unknown;
    switch (type) {
      case "CV_GENERATION":
        result = await runCvGeneration(user, payload as never, ctx);
        break;
      case "LM_GENERATION":
        result = await runLmGeneration(user, payload as never, ctx);
        break;
      case "CV_IMPROVEMENT":
        result = await runCvImprovement(user, payload as never, ctx);
        break;
      case "FACT_EXTRACTION":
        result = await runFactExtraction(user, payload as never, ctx);
        break;
      case "ATS_SCORING":
        result = await runAtsScoring(user, payload as never, ctx);
        break;
      case "TRANSLATION":
        result = await runTranslation(user, payload as never, ctx);
        break;
      default:
        throw new Error(`Unknown job type: ${type}`);
    }
    await completeJob(job.id, result);
    log.debug(
      { jobId: job.id, type: job.type, userId: job.userId },
      "job succeeded",
    );
  } catch (err) {
    if (err instanceof JobCancelledError) {
      await markCancelled(job.id);
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    const willRetry = job.attempts < job.maxAttempts;
    // Central structured report for every job/generation failure. Carries the
    // context an external tracker (Sentry, …) needs to triage.
    reportError(
      err,
      {
        scope: "jobs",
        jobId: job.id,
        jobType: job.type,
        userId: job.userId,
        attempt: job.attempts,
        maxAttempts: job.maxAttempts,
        willRetry,
      },
      `job ${job.type} failed${willRetry ? " (will retry)" : ""}`,
    );
    await failOrRequeueJob(job.id, job.attempts, job.maxAttempts, message);
  }
}
