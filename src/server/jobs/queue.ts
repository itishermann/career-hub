import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { jobEvents } from "./events";
import {
  type JobStatus,
  type JobSummary,
  type JobType,
  parseJobPayload,
} from "./types";

const MAX_ATTEMPTS_DEFAULT = Number.parseInt(
  process.env.JOB_MAX_ATTEMPTS ?? "2",
  10,
);

type JobRow = Awaited<ReturnType<typeof db.job.findFirstOrThrow>>;

export function toSummary(job: JobRow): JobSummary {
  return {
    id: job.id,
    userId: job.userId,
    type: job.type as JobType,
    status: job.status as JobStatus,
    progress: job.progress,
    step: job.step,
    error: job.error,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    result: job.result,
    queuedAt: job.queuedAt.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    finishedAt: job.finishedAt?.toISOString() ?? null,
  };
}

export async function enqueueJob(
  userId: string,
  type: JobType,
  rawPayload: unknown,
  opts?: { maxAttempts?: number },
): Promise<JobRow> {
  const payload = parseJobPayload(type, rawPayload);
  const job = await db.job.create({
    data: {
      userId,
      type,
      payload: payload as unknown as object,
      maxAttempts: opts?.maxAttempts ?? MAX_ATTEMPTS_DEFAULT,
    },
  });
  jobEvents.emitJobUpdate(toSummary(job));
  jobEvents.emitWake();
  return job;
}

/**
 * Atomically claim the oldest QUEUED, non-cancel-requested job and flip it to
 * RUNNING. `FOR UPDATE SKIP LOCKED` guarantees two concurrent callers never
 * grab the same row. Returns null when the queue is empty.
 */
export async function claimNextJob(): Promise<JobRow | null> {
  const rows = await db.$queryRaw<JobRow[]>(Prisma.sql`
    UPDATE "Job" SET
      status = 'RUNNING',
      "startedAt" = now(),
      attempts = attempts + 1,
      "updatedAt" = now()
    WHERE id = (
      SELECT id FROM "Job"
      WHERE status = 'QUEUED' AND "cancelRequested" = false
      ORDER BY "queuedAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING *;
  `);
  const job = rows[0] ?? null;
  if (job) jobEvents.emitJobUpdate(toSummary(job));
  return job;
}

export async function reportProgress(
  jobId: string,
  step: string,
  progress: number,
): Promise<void> {
  const job = await db.job.update({
    where: { id: jobId },
    data: { step, progress },
  });
  jobEvents.emitJobUpdate(toSummary(job));
}

export async function completeJob(
  jobId: string,
  result: unknown,
): Promise<void> {
  const job = await db.job.update({
    where: { id: jobId },
    data: {
      status: "SUCCEEDED",
      progress: 100,
      result: (result ?? {}) as object,
      finishedAt: new Date(),
    },
  });
  jobEvents.emitJobUpdate(toSummary(job));
}

/** Fail terminally, or requeue if attempts remain. */
export async function failOrRequeueJob(
  jobId: string,
  attempts: number,
  maxAttempts: number,
  message: string,
): Promise<void> {
  const requeue = attempts < maxAttempts;
  const job = await db.job.update({
    where: { id: jobId },
    data: requeue
      ? { status: "QUEUED", step: null, startedAt: null, error: message.slice(0, 4000) }
      : { status: "FAILED", error: message.slice(0, 4000), finishedAt: new Date() },
  });
  jobEvents.emitJobUpdate(toSummary(job));
  if (requeue) jobEvents.emitWake();
}

export async function markCancelled(jobId: string): Promise<void> {
  const job = await db.job.update({
    where: { id: jobId },
    data: { status: "CANCELLED", finishedAt: new Date() },
  });
  jobEvents.emitJobUpdate(toSummary(job));
}

/**
 * User-initiated cancel. A QUEUED job is cancelled immediately. A RUNNING job
 * is flagged (cancelRequested) and the worker ends it cooperatively.
 */
export async function requestCancel(
  jobId: string,
  userId: string,
): Promise<void> {
  const job = await db.job.findFirst({ where: { id: jobId, userId } });
  if (!job) throw new Error("Job not found");
  if (job.status === "QUEUED") {
    await markCancelled(jobId);
    return;
  }
  if (job.status === "RUNNING") {
    const updated = await db.job.update({
      where: { id: jobId },
      data: { cancelRequested: true },
    });
    jobEvents.emitJobUpdate(toSummary(updated));
  }
}

export async function retryJob(jobId: string, userId: string): Promise<void> {
  const job = await db.job.findFirst({ where: { id: jobId, userId } });
  if (!job) throw new Error("Job not found");
  if (job.status !== "FAILED" && job.status !== "CANCELLED") {
    throw new Error("Only failed or cancelled jobs can be retried");
  }
  const updated = await db.job.update({
    where: { id: jobId },
    data: {
      status: "QUEUED",
      attempts: 0,
      progress: 0,
      step: null,
      error: null,
      result: Prisma.DbNull,
      cancelRequested: false,
      startedAt: null,
      finishedAt: null,
      queuedAt: new Date(),
    },
  });
  jobEvents.emitJobUpdate(toSummary(updated));
  jobEvents.emitWake();
}

export async function isCancelRequested(jobId: string): Promise<boolean> {
  const job = await db.job.findUnique({
    where: { id: jobId },
    select: { cancelRequested: true },
  });
  return job?.cancelRequested ?? false;
}

/** On worker startup, any RUNNING job is an orphan (concurrency 1, 1 instance). */
export async function recoverOrphans(): Promise<void> {
  const orphans = await db.job.findMany({
    where: { status: "RUNNING" },
    select: { id: true },
  });
  if (orphans.length === 0) return;
  await db.job.updateMany({
    where: { status: "RUNNING" },
    data: { status: "QUEUED", step: null, startedAt: null },
  });
  for (const { id } of orphans) {
    const job = await db.job.findUnique({ where: { id } });
    if (job) jobEvents.emitJobUpdate(toSummary(job));
  }
  jobEvents.emitWake();
}

export async function listJobs(
  userId: string,
  opts?: { limit?: number },
): Promise<JobSummary[]> {
  const jobs = await db.job.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 50,
  });
  return jobs.map(toSummary);
}

export async function getJob(
  jobId: string,
  userId: string,
): Promise<JobSummary | null> {
  const job = await db.job.findFirst({ where: { id: jobId, userId } });
  return job ? toSummary(job) : null;
}
