# Background Job Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move CV/LM generation, journal fact extraction, and ATS scoring off the request path into a durable Postgres-backed background queue with a single in-process sequential worker and real-time (SSE) progress tracking in the UI.

**Architecture:** A `Job` table is the queue (claimed with `FOR UPDATE SKIP LOCKED`). A single in-process worker loop (started from `instrumentation.ts`) claims one job at a time, dispatches to a typed handler, and reports progress by updating the row and emitting events on an in-memory `EventEmitter`. An SSE route subscribes to that emitter and streams updates to a client `JobsProvider` that feeds a sidebar badge and a `/tasks` page. The existing synchronous server actions become thin enqueuers; their pipeline logic moves into handlers that take an explicit `userId` (no request context).

**Tech Stack:** Next.js 16 (App Router, instrumentation, route handlers), Prisma 7 / PostgreSQL 18, Bun (runtime + test), Node `events.EventEmitter`, SSE (`ReadableStream`), Mantine 9, next-intl 4, Zod 3.

**Reference docs:** spec at `docs/superpowers/specs/2026-06-02-background-job-queue-design.md`. Before writing Next-specific code, skim `node_modules/next/dist/docs/` per AGENTS.md (instrumentation + route handler conventions may differ from training data).

---

## File structure

**Create:**
- `src/server/jobs/types.ts` — `JobType`/`JobStatus` constants, Zod payload schemas, `JobSummary` DTO, `JobCancelledError`.
- `src/server/jobs/events.ts` — singleton `EventEmitter`.
- `src/server/jobs/queue.ts` — enqueue/claim/complete/fail/requeue/cancel/retry/list/get/recoverOrphans.
- `src/server/jobs/worker.ts` — loop, dispatch, progress ctx, retry policy.
- `src/server/jobs/handlers/cv.ts` — `runCvGeneration(user, payload, ctx)`.
- `src/server/jobs/handlers/lm.ts` — `runLmGeneration(user, payload, ctx)`.
- `src/server/jobs/handlers/fact-extraction.ts` — `runFactExtraction(user, payload, ctx)`.
- `src/server/jobs/handlers/ats.ts` — `runAtsScoring(user, payload, ctx)`.
- `src/server/jobs/types.test.ts`, `src/server/jobs/queue.test.ts` — unit tests.
- `src/server/actions/jobs.ts` — enqueue + control server actions (`enqueueCvJob`, `enqueueLmJob`, `enqueueFactExtractionJob`, `enqueueAtsScoringJob`, `cancelJobAction`, `retryJobAction`, `listJobsAction`).
- `instrumentation.ts` (project root) — starts the worker.
- `src/app/api/jobs/stream/route.ts` — SSE endpoint.
- `src/components/jobs/JobsProvider.tsx` — client SSE context + `useJobs()` hook.
- `src/components/jobs/TasksView.tsx` — `/tasks` page client view (sections + rows + controls).
- `src/app/[locale]/(app)/tasks/page.tsx` — server page.

**Modify:**
- `prisma/schema.prisma` — add `Job` model + enums + `User.jobs` relation.
- `src/server/actions/snapshot.ts` — thread explicit `userId`.
- `src/server/actions/generations.ts` — replace bodies with enqueuers (logic moved to handlers).
- `src/server/actions/journal.ts` — `extractFactsFromEntry` core moves to handler; keep a thin enqueuer.
- `src/server/ats/score.ts` — `scoreGeneration` core moves to handler; add `runAtsScoring`.
- `src/components/shell/Sidebar.tsx` — add Tasks nav item + live badge.
- `src/components/shell/AppShell.tsx` (or `(app)/layout.tsx`) — mount `JobsProvider`.
- `src/components/campaigns/GenerateModal.tsx` — enqueue instead of inline-wait.
- `src/components/generations/ScoreButton.tsx` — enqueue instead of inline-wait.
- `src/components/generations/GenerationActions.tsx` — regenerate enqueues.
- `src/components/journal/JournalView.tsx` — extract-facts enqueues.
- `messages/fr.json`, `messages/en.json` — `tasks.*` + `nav.tasks` keys.
- `.env.example` — `JOB_MAX_ATTEMPTS`, `JOB_POLL_INTERVAL_MS`.
- `src/lib/env.ts` — parse the two new env vars.

---

## Task 1: Job data model + migration

**Files:**
- Modify: `prisma/schema.prisma` (User model relations block + end of file)

- [ ] **Step 1: Add the relation to `User`**

In `prisma/schema.prisma`, inside `model User { … }`, add to the relations list (next to `generations Generation[]`):

```prisma
  jobs              Job[]
```

- [ ] **Step 2: Append the `Job` model + enums** at the end of `prisma/schema.prisma`:

```prisma
model Job {
  id              String    @id @default(cuid())
  userId          String
  type            JobType
  status          JobStatus @default(QUEUED)
  payload         Json
  progress        Int       @default(0)
  step            String?
  result          Json?
  error           String?   @db.Text
  attempts        Int       @default(0)
  maxAttempts     Int       @default(2)
  cancelRequested Boolean   @default(false)
  queuedAt        DateTime  @default(now())
  startedAt       DateTime?
  finishedAt      DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([status, queuedAt])
  @@index([userId, createdAt])
}

enum JobType {
  CV_GENERATION
  LM_GENERATION
  FACT_EXTRACTION
  ATS_SCORING
}

enum JobStatus {
  QUEUED
  RUNNING
  SUCCEEDED
  FAILED
  CANCELLED
}
```

- [ ] **Step 3: Create the migration**

Run: `bunx prisma migrate dev --name add_job_queue`
Expected: a new folder under `prisma/migrations/…_add_job_queue/` and "Your database is now in sync". Prisma Client regenerates.

- [ ] **Step 4: Verify the client typecheck sees `db.job`**

Run: `bunx tsc --noEmit`
Expected: no errors referencing `job`. (Pre-existing unrelated errors, if any, are out of scope — note them but don't fix.)

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add Job queue model + enums"
```

---

## Task 2: Job types + Zod payload schemas

**Files:**
- Create: `src/server/jobs/types.ts`
- Test: `src/server/jobs/types.test.ts`

- [ ] **Step 1: Write the failing test** — `src/server/jobs/types.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { JOB_PAYLOAD_SCHEMAS, parseJobPayload } from "./types";

describe("job payload schemas", () => {
  test("valid CV payload parses", () => {
    const p = parseJobPayload("CV_GENERATION", {
      templateName: "sobre-fr",
      campaignId: "c1",
      language: "fr",
    });
    expect(p.templateName).toBe("sobre-fr");
  });

  test("CV payload without templateName throws", () => {
    expect(() => parseJobPayload("CV_GENERATION", {})).toThrow();
  });

  test("LM payload requires campaignId", () => {
    expect(() =>
      parseJobPayload("LM_GENERATION", { templateName: "x" }),
    ).toThrow();
  });

  test("FACT_EXTRACTION requires journalEntryId", () => {
    const p = parseJobPayload("FACT_EXTRACTION", { journalEntryId: "e1" });
    expect(p.journalEntryId).toBe("e1");
  });

  test("ATS_SCORING requires generationId", () => {
    const p = parseJobPayload("ATS_SCORING", { generationId: "g1" });
    expect(p.generationId).toBe("g1");
  });

  test("every JobType has a schema", () => {
    for (const t of [
      "CV_GENERATION",
      "LM_GENERATION",
      "FACT_EXTRACTION",
      "ATS_SCORING",
    ] as const) {
      expect(JOB_PAYLOAD_SCHEMAS[t]).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run it, verify failure**

Run: `bun test src/server/jobs/types.test.ts`
Expected: FAIL — cannot find module `./types`.

- [ ] **Step 3: Implement `src/server/jobs/types.ts`:**

```ts
import { z } from "zod";
import { LocaleSchema } from "@/lib/i18n";

export const JOB_TYPES = [
  "CV_GENERATION",
  "LM_GENERATION",
  "FACT_EXTRACTION",
  "ATS_SCORING",
] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const JOB_STATUSES = [
  "QUEUED",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const CvJobPayload = z.object({
  templateName: z.string().min(1),
  campaignId: z.string().optional(),
  language: LocaleSchema.optional(),
});
export const LmJobPayload = z.object({
  templateName: z.string().min(1),
  campaignId: z.string().min(1),
  language: LocaleSchema.optional(),
});
export const FactExtractionJobPayload = z.object({
  journalEntryId: z.string().min(1),
});
export const AtsScoringJobPayload = z.object({
  generationId: z.string().min(1),
});

export const JOB_PAYLOAD_SCHEMAS = {
  CV_GENERATION: CvJobPayload,
  LM_GENERATION: LmJobPayload,
  FACT_EXTRACTION: FactExtractionJobPayload,
  ATS_SCORING: AtsScoringJobPayload,
} as const;

export type JobPayloadFor<T extends JobType> = z.infer<
  (typeof JOB_PAYLOAD_SCHEMAS)[T]
>;

export function parseJobPayload<T extends JobType>(
  type: T,
  raw: unknown,
): JobPayloadFor<T> {
  return JOB_PAYLOAD_SCHEMAS[type].parse(raw) as JobPayloadFor<T>;
}

/** UI/SSE-facing projection of a Job row (no heavy prompt/result blobs). */
export type JobSummary = {
  id: string;
  userId: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  step: string | null;
  error: string | null;
  attempts: number;
  maxAttempts: number;
  result: unknown;
  queuedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

/** Thrown by handlers (via ctx.throwIfCancelled) to end a job as CANCELLED. */
export class JobCancelledError extends Error {
  constructor() {
    super("JOB_CANCELLED");
    this.name = "JobCancelledError";
  }
}
```

Note: `LocaleSchema` is exported from `src/lib/i18n.ts` (already used in `generations.ts`). Confirm by reading that file if the import fails.

- [ ] **Step 4: Run the tests, verify pass**

Run: `bun test src/server/jobs/types.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/server/jobs/types.ts src/server/jobs/types.test.ts
git commit -m "feat(jobs): job types + zod payload schemas"
```

---

## Task 3: In-memory event emitter

**Files:**
- Create: `src/server/jobs/events.ts`

- [ ] **Step 1: Implement `src/server/jobs/events.ts`:**

```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `bunx tsc --noEmit src/server/jobs/events.ts` (or `bunx tsc --noEmit`)
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/server/jobs/events.ts
git commit -m "feat(jobs): in-memory event bus singleton"
```

---

## Task 4: Queue operations

**Files:**
- Create: `src/server/jobs/queue.ts`
- Test: `src/server/jobs/queue.test.ts`

**Note on tests:** these are integration tests that hit the dev Postgres (the project already tests against a real DB — see `src/server/ats/keywords.test.ts`). They require `DATABASE_URL` reachable. Each test cleans up the rows it creates.

- [ ] **Step 1: Write the failing test** — `src/server/jobs/queue.test.ts`:

```ts
import { afterAll, describe, expect, test } from "bun:test";
import { db } from "@/server/db";
import { env } from "@/lib/env";
import {
  claimNextJob,
  completeJob,
  enqueueJob,
  failOrRequeueJob,
  recoverOrphans,
  requestCancel,
  retryJob,
} from "./queue";

// Use the dev/bootstrap user that the seed guarantees exists.
async function testUserId(): Promise<string> {
  const u = await db.user.findFirst({ where: { email: env.BOOTSTRAP_ADMIN_EMAIL } });
  if (!u) throw new Error("seed user missing — run `bun run db:seed`");
  return u.id;
}

const created: string[] = [];

afterAll(async () => {
  if (created.length) await db.job.deleteMany({ where: { id: { in: created } } });
});

describe("queue", () => {
  test("enqueue creates a QUEUED job and claim flips it to RUNNING", async () => {
    const userId = await testUserId();
    const job = await enqueueJob(userId, "CV_GENERATION", { templateName: "t" });
    created.push(job.id);
    expect(job.status).toBe("QUEUED");

    const claimed = await claimNextJob();
    expect(claimed?.status).toBe("RUNNING");
    expect(claimed?.attempts).toBe(1);
    await completeJob(claimed!.id, { generationId: "g1" });
    const done = await db.job.findUnique({ where: { id: claimed!.id } });
    expect(done?.status).toBe("SUCCEEDED");
  });

  test("two concurrent claims never return the same job", async () => {
    const userId = await testUserId();
    const job = await enqueueJob(userId, "ATS_SCORING", { generationId: "g" });
    created.push(job.id);
    const [a, b] = await Promise.all([claimNextJob(), claimNextJob()]);
    const ids = [a?.id, b?.id].filter((x) => x === job.id);
    expect(ids.length).toBeLessThanOrEqual(1);
    if (a) await completeJob(a.id, {});
    if (b) await completeJob(b.id, {});
  });

  test("failOrRequeue: requeues while attempts remain, then FAILS", async () => {
    const userId = await testUserId();
    const job = await enqueueJob(userId, "ATS_SCORING", { generationId: "g" }, { maxAttempts: 2 });
    created.push(job.id);

    const c1 = await claimNextJob(); // attempts=1
    await failOrRequeueJob(c1!.id, c1!.attempts, c1!.maxAttempts, "boom");
    const after1 = await db.job.findUnique({ where: { id: job.id } });
    expect(after1?.status).toBe("QUEUED");

    const c2 = await claimNextJob(); // attempts=2
    await failOrRequeueJob(c2!.id, c2!.attempts, c2!.maxAttempts, "boom");
    const after2 = await db.job.findUnique({ where: { id: job.id } });
    expect(after2?.status).toBe("FAILED");
    expect(after2?.error).toBe("boom");
  });

  test("requestCancel on a QUEUED job is picked up (claim skips cancel-requested)", async () => {
    const userId = await testUserId();
    const job = await enqueueJob(userId, "ATS_SCORING", { generationId: "g" });
    created.push(job.id);
    await requestCancel(job.id, userId);
    const claimed = await claimNextJob();
    expect(claimed?.id).not.toBe(job.id);
    if (claimed) await completeJob(claimed.id, {});
    const row = await db.job.findUnique({ where: { id: job.id } });
    expect(row?.status).toBe("CANCELLED");
  });

  test("retryJob re-queues a FAILED job and resets attempts", async () => {
    const userId = await testUserId();
    const job = await enqueueJob(userId, "ATS_SCORING", { generationId: "g" });
    created.push(job.id);
    await db.job.update({ where: { id: job.id }, data: { status: "FAILED", attempts: 2 } });
    await retryJob(job.id, userId);
    const row = await db.job.findUnique({ where: { id: job.id } });
    expect(row?.status).toBe("QUEUED");
    expect(row?.attempts).toBe(0);
    await db.job.update({ where: { id: job.id }, data: { status: "CANCELLED" } });
  });

  test("recoverOrphans flips RUNNING back to QUEUED", async () => {
    const userId = await testUserId();
    const job = await enqueueJob(userId, "ATS_SCORING", { generationId: "g" });
    created.push(job.id);
    await db.job.update({ where: { id: job.id }, data: { status: "RUNNING", attempts: 1 } });
    await recoverOrphans();
    const row = await db.job.findUnique({ where: { id: job.id } });
    expect(row?.status).toBe("QUEUED");
    await db.job.update({ where: { id: job.id }, data: { status: "CANCELLED" } });
  });
});
```

- [ ] **Step 2: Run it, verify failure**

Run: `bun test src/server/jobs/queue.test.ts`
Expected: FAIL — cannot find module `./queue`.

- [ ] **Step 3: Implement `src/server/jobs/queue.ts`:**

```ts
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
  await db.job.updateMany({
    where: { status: "RUNNING" },
    data: { status: "QUEUED", step: null, startedAt: null },
  });
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
```

- [ ] **Step 4: Run the tests, verify pass**

Run: `bun test src/server/jobs/queue.test.ts`
Expected: PASS (6 tests). If "seed user missing", run `bun run db:seed` first.

- [ ] **Step 5: Commit**

```bash
git add src/server/jobs/queue.ts src/server/jobs/queue.test.ts
git commit -m "feat(jobs): postgres-backed queue ops with SKIP LOCKED claim"
```

---

## Task 5: Thread explicit userId through snapshot helpers

The worker has no request context, so `buildProfileSnapshot` / `persistSnapshot` cannot call `requireUser()`. Make `userId` an explicit parameter while keeping the request-time callers working.

**Files:**
- Modify: `src/server/actions/snapshot.ts`

- [ ] **Step 1: Change `buildProfileSnapshot` to take a resolved user.**

Replace the signature and the first lines:

```ts
// before:
export async function buildProfileSnapshot(language: Locale): Promise<ProfileSnapshotShape> {
  const user = await requireUser();
// after:
export async function buildProfileSnapshot(
  language: Locale,
  account: { id: string; name: string | null; email: string },
): Promise<ProfileSnapshotShape> {
  const user = account;
```

Remove the now-unused `requireUser` import only if nothing else in the file uses it (see Step 2 — `persistSnapshot` also used it).

- [ ] **Step 2: Change `persistSnapshot` to take `userId`:**

```ts
export async function persistSnapshot(
  reason: string,
  snapshot: ProfileSnapshotShape,
  userId: string,
): Promise<string> {
  const row = await db.profileSnapshot.create({
    data: { userId, snapshot: snapshot as unknown as object, reason },
  });
  return row.id;
}
```

Then delete the `import { requireUser } from "@/server/auth-helpers";` line (no longer used in this file).

- [ ] **Step 3: Typecheck — expect errors only at the call sites in `generations.ts`** (fixed in Task 6/7):

Run: `bunx tsc --noEmit`
Expected: errors limited to `src/server/actions/generations.ts` calls to `buildProfileSnapshot` / `persistSnapshot`. Note them; Task 6/7 resolves them.

- [ ] **Step 4: Commit**

```bash
git add src/server/actions/snapshot.ts
git commit -m "refactor(jobs): thread explicit userId through snapshot helpers"
```

---

## Task 6: CV generation handler

Move the CV pipeline out of the server action into a handler that takes an explicit user and a progress/cancel context.

**Files:**
- Create: `src/server/jobs/handlers/cv.ts`
- Reference (source to move): `src/server/actions/generations.ts:24-155` (`generateCv`)

- [ ] **Step 1: Define the handler context type** — create `src/server/jobs/handlers/context.ts`:

```ts
export type JobContext = {
  jobId: string;
  reportProgress: (step: string, progress: number) => Promise<void>;
  throwIfCancelled: () => Promise<void>;
};

export type JobUser = {
  id: string;
  name: string | null;
  email: string;
  llmConfig: unknown;
};
```

- [ ] **Step 2: Implement `src/server/jobs/handlers/cv.ts`** by moving the body of `generateCv`. Concrete changes vs the original:
  - Signature: `export async function runCvGeneration(user: JobUser, payload: CvJobPayload, ctx: JobContext): Promise<{ generationId: string; pdfAvailable: boolean; warning?: string }>`.
  - Delete `const user = await requireUser();` and `const input = GenerateCvInput.parse(raw);` — use `payload` (already validated) and the passed `user`.
  - `buildProfileSnapshot(language)` → `buildProfileSnapshot(language, { id: user.id, name: user.name, email: user.email })`.
  - `persistSnapshot("generation:cv:pending", snapshot)` → `persistSnapshot("generation:cv:pending", snapshot, user.id)`.
  - `getLlmProviderForUser(user.llmConfig, …)` and `parseLlmConfig(user.llmConfig)` stay (they already take `llmConfig`).
  - Remove the two `revalidatePath(...)` calls (no request scope in the worker).
  - Insert progress + cancel checks between steps:

```ts
export async function runCvGeneration(user, payload, ctx) {
  const template = await db.template.findUnique({ where: { name: payload.templateName } });
  if (!template) throw new Error(`Template not found: ${payload.templateName}`);
  if (template.type !== "CV") throw new Error(`Template ${payload.templateName} is not a CV template`);

  const campaign = payload.campaignId
    ? await db.campaign.findFirst({ where: { id: payload.campaignId, userId: user.id } })
    : null;
  const language = payload.language ?? (campaign?.targetLanguage as "fr" | "en") ?? "fr";
  if (!template.supportedLanguages.includes(language)) {
    throw new Error(`Template ${template.name} does not support language ${language} (supports ${template.supportedLanguages.join(", ")})`);
  }

  const startedAt = Date.now();
  await ctx.reportProgress("snapshot", 5);
  await ctx.throwIfCancelled();
  const snapshot = await buildProfileSnapshot(language, { id: user.id, name: user.name, email: user.email });
  const profileSnapshotId = await persistSnapshot("generation:cv:pending", snapshot, user.id);

  await ctx.reportProgress("journal", 15);
  await ctx.throwIfCancelled();
  const journalExcerpts = campaign
    ? await retrieveJournalContext({ userId: user.id, rawLlmConfig: user.llmConfig, queryText: campaignQueryText(campaign), k: 10 })
    : [];

  await ctx.reportProgress("prompt", 20);
  const { system, prompt } = buildCvPrompt({
    language,
    template: { name: template.name, typstSource: template.typstSource, meta: template.meta },
    profileSnapshot: snapshot,
    campaign: campaign
      ? { targetCompany: campaign.targetCompany, targetRole: campaign.targetRole, jobDescription: campaign.jobDescription }
      : undefined,
    journalExcerpts,
  });

  await ctx.reportProgress("llm", 25);
  await ctx.throwIfCancelled();
  const llmConfig = parseLlmConfig(user.llmConfig);
  const provider = getLlmProviderForUser(user.llmConfig, `cv:typst:${language}`);
  const llmResult = await provider.generateText({ system, prompt });
  const typstSource = llmResult.text;
  if (typstSource.trim().length === 0) {
    throw new Error(`La génération a renvoyé un Typst vide (modèle ${provider.model}). Aucun PDF ne peut être produit — vérifie la configuration du modèle dans /settings/llm.`);
  }

  await ctx.reportProgress("typst", 85);
  await ctx.throwIfCancelled();
  let pdfPath: string | null = null;
  let warning: string | undefined;
  if (await isTypstAvailable()) {
    const compileResult = await compileTypst({ source: typstSource, outputName: `cv-${profileSnapshotId}`, bucket: "generations" });
    if (compileResult.ok) pdfPath = compileResult.pdfPath;
    else warning = `Typst compilation failed — Typst source saved, PDF unavailable.\n${compileResult.error.slice(0, 500)}`;
  } else {
    warning = "Native Typst compiler unavailable on this platform — Typst source saved, PDF unavailable.";
  }

  const generation = await db.generation.create({
    data: {
      userId: user.id, campaignId: campaign?.id, templateId: template.id, profileSnapshotId,
      type: "CV", language, llmProvider: llmConfig.mode, llmModel: provider.model,
      llmPrompt: prompt, outputTypst: typstSource, outputPdfPath: pdfPath,
      durationMs: Date.now() - startedAt,
      inputTokens: llmResult.usage.inputTokens, outputTokens: llmResult.usage.outputTokens,
      costCents: llmResult.usage.costCents ?? 0,
    },
  });

  await ctx.reportProgress("done", 100);
  return { generationId: generation.id, pdfAvailable: pdfPath !== null, warning };
}
```

  Imports needed at the top of the file:

```ts
import { db } from "@/server/db";
import { getLlmProviderForUser, parseLlmConfig } from "@/server/llm/client";
import { buildCvPrompt } from "@/server/llm/prompts/cv-generator";
import { campaignQueryText, retrieveJournalContext } from "@/server/rag/retrieve";
import { compileTypst, isTypstAvailable } from "@/server/typst/compile";
import { buildProfileSnapshot, persistSnapshot } from "@/server/actions/snapshot";
import type { CvJobPayload as CvJobPayloadSchema } from "@/server/jobs/types";
import type { z } from "zod";
import type { JobContext, JobUser } from "./context";
type CvJobPayload = z.infer<typeof CvJobPayloadSchema>;
```

(Adjust the payload type import to your preference — simplest is to import the inferred type from `types.ts`.)

- [ ] **Step 3: Typecheck the handler**

Run: `bunx tsc --noEmit`
Expected: no errors inside `handlers/cv.ts`. (generations.ts call sites still error until Task 12.)

- [ ] **Step 4: Commit**

```bash
git add src/server/jobs/handlers/context.ts src/server/jobs/handlers/cv.ts
git commit -m "feat(jobs): CV generation handler"
```

---

## Task 7: Cover letter handler

**Files:**
- Create: `src/server/jobs/handlers/lm.ts`
- Reference (source to move): `src/server/actions/generations.ts:167-286` (`generateLm`)

- [ ] **Step 1: Implement `src/server/jobs/handlers/lm.ts`** mirroring Task 6's structure. Signature: `export async function runLmGeneration(user: JobUser, payload: LmJobPayload, ctx: JobContext)`. Apply the same transformations as Task 6:
  - campaign is required: `const campaign = await db.campaign.findFirst({ where: { id: payload.campaignId, userId: user.id } }); if (!campaign) throw new Error("Campaign not found");`
  - `buildProfileSnapshot(language, { id: user.id, name: user.name, email: user.email })`, `persistSnapshot("generation:lm:pending", snapshot, user.id)`.
  - Use `buildLmPrompt` with the contact fields (`contactName`, `contactEmail`) exactly as in the original `generateLm`.
  - `getLlmProviderForUser(user.llmConfig, \`lm:typst:${language}\`)`, output name `lm-${profileSnapshotId}`, generation `type: "COVER_LETTER"`.
  - Same progress checkpoints (snapshot 5 → journal 15 → prompt 20 → llm 25 → typst 85 → done 100) and `throwIfCancelled` placement as Task 6.
  - Remove `revalidatePath` and `requireUser`.
  - Returns `{ generationId, pdfAvailable, warning }`.

  Imports: same set as Task 6 but `buildLmPrompt` instead of `buildCvPrompt`.

- [ ] **Step 2: Typecheck**

Run: `bunx tsc --noEmit`
Expected: no errors inside `handlers/lm.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/server/jobs/handlers/lm.ts
git commit -m "feat(jobs): cover letter generation handler"
```

---

## Task 8: Fact extraction handler

**Files:**
- Create: `src/server/jobs/handlers/fact-extraction.ts`
- Reference (source to move): `src/server/actions/journal.ts:155-203` (`extractFactsFromEntry` + `maybeReconcile`)

- [ ] **Step 1: Read the full current `extractFactsFromEntry` and `maybeReconcile`** in `src/server/actions/journal.ts` so the moved logic is faithful (fact replace + `maybeReconcile`).

- [ ] **Step 2: Implement `src/server/jobs/handlers/fact-extraction.ts`:**

```ts
import { db } from "@/server/db";
import { getLlmProviderForUser } from "@/server/llm/client";
import {
  ExtractedFactsSchema,
  buildExtractorPrompt,
} from "@/server/llm/prompts/extractor";
import type { JobContext, JobUser } from "./context";

export async function runFactExtraction(
  user: JobUser,
  payload: { journalEntryId: string },
  ctx: JobContext,
): Promise<{ count: number }> {
  await ctx.reportProgress("load", 10);
  const entry = await db.journalEntry.findFirst({
    where: { id: payload.journalEntryId, userId: user.id },
  });
  if (!entry) throw new Error("Entry not found");

  await ctx.reportProgress("llm", 30);
  await ctx.throwIfCancelled();
  const provider = getLlmProviderForUser(user.llmConfig, "journal:extract");
  const { system, prompt } = buildExtractorPrompt(
    entry.content,
    entry.language as "fr" | "en",
  );
  const result = await provider.generateJson({
    system,
    prompt,
    schema: ExtractedFactsSchema,
  });

  await ctx.reportProgress("store", 80);
  await db.extractedFact.deleteMany({
    where: { journalEntryId: entry.id, applied: false, rejectedAt: null },
  });
  for (const fact of result.facts) {
    await db.extractedFact.create({
      data: {
        journalEntryId: entry.id,
        factType: fact.factType,
        factContent: fact as unknown as object,
      },
    });
  }

  await ctx.reportProgress("done", 100);
  return { count: result.facts.length };
}
```

  IMPORTANT: cross-check the exact `db.extractedFact` write shape against the current `extractFactsFromEntry` body (field names like `factType`/`factContent` and the delete filter). Reproduce the original's behavior exactly; the snippet above is the expected shape but the source file is authoritative.

- [ ] **Step 3: Typecheck**

Run: `bunx tsc --noEmit`
Expected: no errors inside the handler.

- [ ] **Step 4: Commit**

```bash
git add src/server/jobs/handlers/fact-extraction.ts
git commit -m "feat(jobs): journal fact extraction handler"
```

---

## Task 9: ATS scoring handler

**Files:**
- Create: `src/server/jobs/handlers/ats.ts`
- Modify: `src/server/ats/score.ts` (extract core; keep a thin request-time wrapper for now)
- Reference: `src/server/ats/score.ts` (`scoreGeneration`)

- [ ] **Step 1: Read the full `scoreGeneration` body** in `src/server/ats/score.ts` to capture the 4-stage pipeline exactly.

- [ ] **Step 2: Implement `src/server/jobs/handlers/ats.ts`** by moving the core of `scoreGeneration`. Concrete changes:
  - Signature: `export async function runAtsScoring(user: JobUser, payload: { generationId: string }, ctx: JobContext): Promise<{ global: number }>`.
  - Replace `const user = await requireUser();` with the passed `user`; fetch the generation with `where: { id: payload.generationId, userId: user.id }`.
  - Replace `getLlmProviderForUser(user.llmConfig, …)` (already takes llmConfig) and `getOrExtractCampaignKeywords(..., user.llmConfig)` unchanged.
  - Remove `revalidatePath`.
  - Persist the score onto the Generation exactly as the original does (`db.generation.update({ where:{id}, data:{ atsScore: … } })`).
  - Add progress checkpoints: `extract` 20 → `heuristics` 35 → `keywords` 55 → `contextual` 60 → `persist` 95 → `done` 100, with `throwIfCancelled()` before the LLM (`contextual`) step.
  - Return `{ global: <persisted global score> }`.

  Keep all stage helper imports (`extractPdfText`, `extractTypstText`, `scoreHeuristics`, `getOrExtractCampaignKeywords`, `matchKeywordsAgainst`, `buildAtsContextualPrompt`, `AtsContextualScoreSchema`) pointing at their existing modules.

- [ ] **Step 3: Typecheck**

Run: `bunx tsc --noEmit`
Expected: no errors inside the handler.

- [ ] **Step 4: Commit**

```bash
git add src/server/jobs/handlers/ats.ts
git commit -m "feat(jobs): ATS scoring handler"
```

---

## Task 10: Worker loop + dispatch

**Files:**
- Create: `src/server/jobs/worker.ts`

- [ ] **Step 1: Implement `src/server/jobs/worker.ts`:**

```ts
import { db } from "@/server/db";
import { jobEvents } from "./events";
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
import type { JobContext, JobUser } from "./handlers/context";
import { runCvGeneration } from "./handlers/cv";
import { runLmGeneration } from "./handlers/lm";
import { runFactExtraction } from "./handlers/fact-extraction";
import { runAtsScoring } from "./handlers/ats";

const POLL_INTERVAL_MS = Number.parseInt(
  process.env.JOB_POLL_INTERVAL_MS ?? "2000",
  10,
);

let started = false;
let draining = false;

export function startWorker(): void {
  if (started) return;
  started = true;
  console.log("[jobs] worker starting");
  recoverOrphans()
    .catch((e) => console.error("[jobs] orphan recovery failed", e))
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
    console.error("[jobs] drain error", e);
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
      case "FACT_EXTRACTION":
        result = await runFactExtraction(user, payload as never, ctx);
        break;
      case "ATS_SCORING":
        result = await runAtsScoring(user, payload as never, ctx);
        break;
      default:
        throw new Error(`Unknown job type: ${type}`);
    }
    await completeJob(job.id, result);
  } catch (err) {
    if (err instanceof JobCancelledError) {
      await markCancelled(job.id);
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[jobs] job ${job.id} failed:`, message);
    await failOrRequeueJob(job.id, job.attempts, job.maxAttempts, message);
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `bunx tsc --noEmit`
Expected: no errors in `worker.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/server/jobs/worker.ts
git commit -m "feat(jobs): sequential in-process worker loop + dispatch"
```

---

## Task 11: Start the worker via instrumentation

**Files:**
- Create: `instrumentation.ts` (project root)

- [ ] **Step 1: Check Next 16 instrumentation conventions**

Read: `node_modules/next/dist/docs/` (search for "instrumentation"). Confirm `register()` is the entry and runs server-side.

- [ ] **Step 2: Implement `instrumentation.ts`:**

```ts
// Runs once when the Next.js server process boots. We start the in-process job
// worker here. Guarded to the Node.js runtime (not Edge) and to a single start.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startWorker } = await import("@/server/jobs/worker");
  startWorker();
}
```

- [ ] **Step 3: Verify the worker boots in dev**

Run: `bun run dev` (in a background shell), then check the dev server logs.
Expected: a `[jobs] worker starting` line appears once. Stop the dev server after confirming.

- [ ] **Step 4: Commit**

```bash
git add instrumentation.ts
git commit -m "feat(jobs): start worker from instrumentation hook"
```

---

## Task 12: Enqueuer + control server actions; rewire existing actions

**Files:**
- Create: `src/server/actions/jobs.ts`
- Modify: `src/server/actions/generations.ts` (replace `generateCv`/`generateLm` bodies with enqueuers; `regenerateFromSnapshot` enqueues)
- Modify: `src/server/actions/journal.ts` (`extractFactsFromEntry` → enqueuer)
- Modify: `src/server/ats/score.ts` (`scoreGeneration` → enqueuer that returns `{ jobId }`)

- [ ] **Step 1: Implement `src/server/actions/jobs.ts`:**

```ts
"use server";

import { requireUser } from "@/server/auth-helpers";
import {
  enqueueJob,
  getJob,
  listJobs,
  requestCancel,
  retryJob,
} from "@/server/jobs/queue";
import type { JobSummary, JobType } from "@/server/jobs/types";

async function enqueueFor(type: JobType, payload: unknown): Promise<{ jobId: string }> {
  const user = await requireUser();
  const job = await enqueueJob(user.id, type, payload);
  return { jobId: job.id };
}

export async function enqueueCvJob(payload: {
  templateName: string;
  campaignId?: string;
  language?: "fr" | "en";
}): Promise<{ jobId: string }> {
  return enqueueFor("CV_GENERATION", payload);
}

export async function enqueueLmJob(payload: {
  templateName: string;
  campaignId: string;
  language?: "fr" | "en";
}): Promise<{ jobId: string }> {
  return enqueueFor("LM_GENERATION", payload);
}

export async function enqueueFactExtractionJob(
  journalEntryId: string,
): Promise<{ jobId: string }> {
  return enqueueFor("FACT_EXTRACTION", { journalEntryId });
}

export async function enqueueAtsScoringJob(
  generationId: string,
): Promise<{ jobId: string }> {
  return enqueueFor("ATS_SCORING", { generationId });
}

export async function cancelJobAction(jobId: string): Promise<void> {
  const user = await requireUser();
  await requestCancel(jobId, user.id);
}

export async function retryJobAction(jobId: string): Promise<void> {
  const user = await requireUser();
  await retryJob(jobId, user.id);
}

export async function listJobsAction(): Promise<JobSummary[]> {
  const user = await requireUser();
  return listJobs(user.id);
}

export async function getJobAction(jobId: string): Promise<JobSummary | null> {
  const user = await requireUser();
  return getJob(jobId, user.id);
}
```

- [ ] **Step 2: Replace `generateCv` / `generateLm` / `regenerateFromSnapshot` in `src/server/actions/generations.ts`** with thin enqueuers. Replace the entire file contents with:

```ts
"use server";

import { z } from "zod";
import { LocaleSchema } from "@/lib/i18n";
import { requireUser } from "@/server/auth-helpers";
import { db } from "@/server/db";
import { enqueueJob } from "@/server/jobs/queue";

const GenerateCvInput = z.object({
  templateName: z.string().min(1),
  campaignId: z.string().optional(),
  language: LocaleSchema.optional(),
});

export async function generateCv(
  raw: z.infer<typeof GenerateCvInput>,
): Promise<{ jobId: string }> {
  const user = await requireUser();
  const input = GenerateCvInput.parse(raw);
  const job = await enqueueJob(user.id, "CV_GENERATION", input);
  return { jobId: job.id };
}

const GenerateLmInput = z.object({
  templateName: z.string().min(1),
  campaignId: z.string().min(1),
  language: LocaleSchema.optional(),
});

export async function generateLm(
  raw: z.infer<typeof GenerateLmInput>,
): Promise<{ jobId: string }> {
  const user = await requireUser();
  const input = GenerateLmInput.parse(raw);
  const job = await enqueueJob(user.id, "LM_GENERATION", input);
  return { jobId: job.id };
}

export async function regenerateFromSnapshot(
  generationId: string,
): Promise<{ jobId: string }> {
  const user = await requireUser();
  const source = await db.generation.findFirst({
    where: { id: generationId, userId: user.id },
    include: { template: true },
  });
  if (!source) throw new Error("Generation not found");

  if (source.type === "CV") {
    const job = await enqueueJob(user.id, "CV_GENERATION", {
      templateName: source.template.name,
      campaignId: source.campaignId ?? undefined,
      language: source.language as "fr" | "en",
    });
    return { jobId: job.id };
  }
  if (source.type === "COVER_LETTER" && source.campaignId) {
    const job = await enqueueJob(user.id, "LM_GENERATION", {
      templateName: source.template.name,
      campaignId: source.campaignId,
      language: source.language as "fr" | "en",
    });
    return { jobId: job.id };
  }
  throw new Error("Cannot regenerate without a campaign");
}
```

- [ ] **Step 3: Rewire `extractFactsFromEntry` in `src/server/actions/journal.ts`.** Replace the `extractFactsFromEntry` function body (keep `maybeReconcile`, `applyExtractedFact`, etc.) with an enqueuer:

```ts
/** Enqueue fact extraction for an entry. Returns the job id. */
export async function extractFactsFromEntry(
  entryId: string,
): Promise<{ jobId: string }> {
  const user = await requireUser();
  const entry = await db.journalEntry.findFirst({
    where: { id: entryId, userId: user.id },
  });
  if (!entry) throw new Error("Entry not found");
  const job = await enqueueJob(user.id, "FACT_EXTRACTION", {
    journalEntryId: entryId,
  });
  return { jobId: job.id };
}
```

Add `import { enqueueJob } from "@/server/jobs/queue";` to the file. Remove now-unused imports (`buildExtractorPrompt`, `ExtractedFactsSchema`, `getLlmProviderForUser`) ONLY if no other function in `journal.ts` uses them — verify with a grep first; `maybeReconcile` may still be referenced by `runFactExtraction`? No — `maybeReconcile` lives in journal.ts and is called by the old extract flow. The handler (Task 8) does the delete+create itself; if `maybeReconcile` is no longer called anywhere, leave it (harmless) or remove it. Keep behavior: if the original `extractFactsFromEntry` called `maybeReconcile`, move that call into the handler (Task 8 Step 2) to preserve it.

- [ ] **Step 4: Rewire `scoreGeneration` in `src/server/ats/score.ts`** to enqueue. Replace the `scoreGeneration` export with:

```ts
"use server";

import { requireUser } from "@/server/auth-helpers";
import { enqueueJob } from "@/server/jobs/queue";

export async function scoreGeneration(
  generationId: string,
): Promise<{ jobId: string }> {
  const user = await requireUser();
  const job = await enqueueJob(user.id, "ATS_SCORING", { generationId });
  return { jobId: job.id };
}
```

Keep the stage helpers in this file ONLY if the handler imports them from here; otherwise (cleaner) the handler imports `extractPdfText` etc. from their original modules (`./extract`, `./heuristics`, `./keywords`) and the contextual prompt from `@/server/llm/prompts/ats-scorer`, leaving `score.ts` as just the enqueuer. Pick the latter.

- [ ] **Step 5: Typecheck the whole project**

Run: `bunx tsc --noEmit`
Expected: errors now only in UI components that consume the old return shapes (`GenerationStream`/`GenerateModal`/`ScoreButton`/`JournalView`) — fixed in Tasks 15–17.

- [ ] **Step 6: Commit**

```bash
git add src/server/actions/jobs.ts src/server/actions/generations.ts src/server/actions/journal.ts src/server/ats/score.ts src/server/jobs/handlers/fact-extraction.ts
git commit -m "feat(jobs): turn generation/extraction/scoring actions into enqueuers"
```

---

## Task 13: SSE stream route

**Files:**
- Create: `src/app/api/jobs/stream/route.ts`

- [ ] **Step 1: Check Next 16 route handler + streaming conventions**

Read `node_modules/next/dist/docs/` for route handlers / streaming responses. Confirm `Request.signal` is available for abort cleanup.

- [ ] **Step 2: Implement `src/app/api/jobs/stream/route.ts`:**

```ts
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
```

- [ ] **Step 3: Manual smoke test**

Run dev server, then: `curl -N http://localhost:3000/api/jobs/stream` (with `AUTH_ENABLED=false`).
Expected: an immediate `data: {"type":"snapshot",...}` line, then `: hb` every 15s. Ctrl-C to stop.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/jobs/stream/route.ts
git commit -m "feat(jobs): SSE stream route for live job updates"
```

---

## Task 14: Client JobsProvider + useJobs hook

**Files:**
- Create: `src/components/jobs/JobsProvider.tsx`
- Modify: `src/components/shell/AppShell.tsx` (wrap children)

- [ ] **Step 1: Read `src/components/shell/AppShell.tsx`** to see how to wrap the tree.

- [ ] **Step 2: Implement `src/components/jobs/JobsProvider.tsx`:**

```tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { JobSummary } from "@/server/jobs/types";

type JobsContextValue = {
  jobs: JobSummary[];
  activeCount: number; // QUEUED + RUNNING
};

const JobsContext = createContext<JobsContextValue>({
  jobs: [],
  activeCount: 0,
});

export function useJobs(): JobsContextValue {
  return useContext(JobsContext);
}

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const jobsRef = useRef<Map<string, JobSummary>>(new Map());

  useEffect(() => {
    let es: EventSource | null = null;
    let stopped = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const apply = () =>
      setJobs(
        [...jobsRef.current.values()].sort((a, b) =>
          b.queuedAt.localeCompare(a.queuedAt),
        ),
      );

    const connect = () => {
      if (stopped) return;
      es = new EventSource("/api/jobs/stream");
      es.onmessage = (ev) => {
        const msg = JSON.parse(ev.data) as
          | { type: "snapshot"; jobs: JobSummary[] }
          | { type: "update"; job: JobSummary };
        if (msg.type === "snapshot") {
          jobsRef.current = new Map(msg.jobs.map((j) => [j.id, j]));
        } else {
          jobsRef.current.set(msg.job.id, msg.job);
        }
        apply();
      };
      es.onerror = () => {
        es?.close();
        if (!stopped) retry = setTimeout(connect, 3000);
      };
    };
    connect();

    return () => {
      stopped = true;
      if (retry) clearTimeout(retry);
      es?.close();
    };
  }, []);

  const value = useMemo<JobsContextValue>(() => {
    const activeCount = jobs.filter(
      (j) => j.status === "QUEUED" || j.status === "RUNNING",
    ).length;
    return { jobs, activeCount };
  }, [jobs]);

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}
```

- [ ] **Step 3: Mount it in `AppShell.tsx`** — wrap the rendered tree:

```tsx
import { JobsProvider } from "@/components/jobs/JobsProvider";
// …inside the component return, wrap the existing shell:
return <JobsProvider>{/* existing shell JSX */}</JobsProvider>;
```

(Place `JobsProvider` so both the `Sidebar` and page `children` are inside it.)

- [ ] **Step 4: Typecheck**

Run: `bunx tsc --noEmit`
Expected: no errors in these two files.

- [ ] **Step 5: Commit**

```bash
git add src/components/jobs/JobsProvider.tsx src/components/shell/AppShell.tsx
git commit -m "feat(jobs): client SSE JobsProvider + useJobs hook"
```

---

## Task 15: Sidebar Tasks nav item + live badge

**Files:**
- Modify: `src/components/shell/Sidebar.tsx`

- [ ] **Step 1: Add the nav type + item.** In `Sidebar.tsx`:
  - Extend the `NavItem` `key` union to include `"tasks"`.
  - Import `ListChecks` from `lucide-react` and `useJobs` from `@/components/jobs/JobsProvider`, and Mantine `Badge`.
  - Add to `NAV_ITEMS` after `generations`:

```ts
  { key: "tasks", href: "/tasks", icon: ListChecks },
```

- [ ] **Step 2: Render the badge.** Inside the `.map`, where the nav item label renders, append a badge for the tasks item:

```tsx
const { activeCount } = useJobs(); // call at top of component, not in map
// …inside the <Link> for items, after <span>{t(item.key)}</span>:
{item.key === "tasks" && activeCount > 0 && (
  <Badge size="xs" circle color="magenta" ml="auto">
    {activeCount}
  </Badge>
)}
```

(Call `const { activeCount } = useJobs();` once near the other hooks at the top of `Sidebar`.)

- [ ] **Step 3: Add the `nav.tasks` translation key** — handled in Task 18; for now the key will render as `tasks` until then.

- [ ] **Step 4: Typecheck**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/shell/Sidebar.tsx
git commit -m "feat(jobs): sidebar Tasks nav item with live active-count badge"
```

---

## Task 16: /tasks page

**Files:**
- Create: `src/app/[locale]/(app)/tasks/page.tsx`
- Create: `src/components/jobs/TasksView.tsx`

- [ ] **Step 1: Implement the server page `src/app/[locale]/(app)/tasks/page.tsx`:**

```tsx
import { setRequestLocale } from "next-intl/server";
import { TasksView } from "@/components/jobs/TasksView";
import { listJobsAction } from "@/server/actions/jobs";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const initialJobs = await listJobsAction();
  return <TasksView initialJobs={initialJobs} />;
}
```

(Confirm `setRequestLocale` is the pattern other pages use — check a sibling page like `generations/page.tsx`. If they don't call it, omit it.)

- [ ] **Step 2: Implement `src/components/jobs/TasksView.tsx`:**

```tsx
"use client";

import {
  Alert,
  Badge,
  Button,
  Card,
  Collapse,
  Group,
  Progress,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { AlertCircle, Ban, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useJobs } from "@/components/jobs/JobsProvider";
import { useRouter } from "@/i18n/navigation";
import {
  cancelJobAction,
  retryJobAction,
} from "@/server/actions/jobs";
import type { JobStatus, JobSummary } from "@/server/jobs/types";

export function TasksView({ initialJobs }: { initialJobs: JobSummary[] }) {
  const t = useTranslations("tasks");
  const live = useJobs();
  // Prefer live SSE data once it has loaded; fall back to SSR snapshot.
  const jobs = live.jobs.length ? live.jobs : initialJobs;

  const running = jobs.filter((j) => j.status === "RUNNING");
  const queued = jobs.filter((j) => j.status === "QUEUED");
  const finished = jobs
    .filter(
      (j) =>
        j.status === "SUCCEEDED" ||
        j.status === "FAILED" ||
        j.status === "CANCELLED",
    )
    .slice(0, 20);

  return (
    <Stack gap="lg">
      <Title order={2}>{t("title")}</Title>

      <Section title={t("running")} empty={t("none-running")} jobs={running} t={t} />
      <Section title={t("queued")} empty={t("none-queued")} jobs={queued} t={t} />
      <Section title={t("finished")} empty={t("none-finished")} jobs={finished} t={t} />
    </Stack>
  );
}

function Section({
  title,
  empty,
  jobs,
  t,
}: {
  title: string;
  empty: string;
  jobs: JobSummary[];
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <Stack gap="xs">
      <Text fw={600} size="sm" tt="uppercase" c="dimmed">
        {title}
      </Text>
      {jobs.length === 0 ? (
        <Text size="sm" c="dimmed">
          {empty}
        </Text>
      ) : (
        jobs.map((job) => <JobRow key={job.id} job={job} t={t} />)
      )}
    </Stack>
  );
}

const STATUS_COLOR: Record<JobStatus, string> = {
  QUEUED: "gray",
  RUNNING: "blue",
  SUCCEEDED: "green",
  FAILED: "red",
  CANCELLED: "gray",
};

function JobRow({
  job,
  t,
}: {
  job: JobSummary;
  t: ReturnType<typeof useTranslations>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showError, setShowError] = useState(false);

  const cancellable = job.status === "QUEUED" || job.status === "RUNNING";
  const retryable = job.status === "FAILED" || job.status === "CANCELLED";
  const result = job.result as { generationId?: string } | null;

  return (
    <Card withBorder padding="sm" radius="md">
      <Group justify="space-between" wrap="nowrap">
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Group gap={8}>
            <Badge size="sm" color={STATUS_COLOR[job.status]} variant="light">
              {t(`status.${job.status}`)}
            </Badge>
            <Text size="sm" fw={500}>
              {t(`type.${job.type}`)}
            </Text>
            {job.attempts > 1 && (
              <Text size="xs" c="dimmed">
                {t("attempt", { n: job.attempts, max: job.maxAttempts })}
              </Text>
            )}
          </Group>
          {job.status === "RUNNING" && (
            <>
              <Progress value={job.progress} size="sm" animated />
              {job.step && (
                <Text size="xs" c="dimmed">
                  {job.step}
                </Text>
              )}
            </>
          )}
          {job.status === "SUCCEEDED" && result?.generationId && (
            <Button
              size="xs"
              variant="subtle"
              w="fit-content"
              onClick={() => router.push(`/generations/${result.generationId}`)}
            >
              {t("view-result")}
            </Button>
          )}
        </Stack>

        <Group gap="xs">
          {job.status === "FAILED" && job.error && (
            <Button
              size="xs"
              variant="subtle"
              color="red"
              leftSection={<AlertCircle size={12} />}
              onClick={() => setShowError((v) => !v)}
            >
              {t("view-error")}
            </Button>
          )}
          {retryable && (
            <Button
              size="xs"
              variant="default"
              leftSection={<RotateCcw size={12} />}
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await retryJobAction(job.id);
                  } catch (e) {
                    notifications.show({
                      color: "red",
                      message: e instanceof Error ? e.message : "Retry failed",
                    });
                  }
                })
              }
            >
              {t("retry")}
            </Button>
          )}
          {cancellable && (
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              leftSection={<Ban size={12} />}
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await cancelJobAction(job.id);
                  } catch (e) {
                    notifications.show({
                      color: "red",
                      message: e instanceof Error ? e.message : "Cancel failed",
                    });
                  }
                })
              }
            >
              {t("cancel")}
            </Button>
          )}
        </Group>
      </Group>

      {job.error && (
        <Collapse in={showError}>
          <Alert mt="sm" color="red" variant="light">
            <Text size="xs" style={{ whiteSpace: "pre-wrap" }}>
              {job.error}
            </Text>
          </Alert>
        </Collapse>
      )}
    </Card>
  );
}
```

- [ ] **Step 2b:** Confirm `notifications` is wired (the project already uses `@mantine/notifications` in `ScoreButton.tsx`, so the provider exists).

- [ ] **Step 3: Typecheck**

Run: `bunx tsc --noEmit`
Expected: no errors except missing `tasks.*` translation keys at runtime (added Task 18).

- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/(app)/tasks/page.tsx" src/components/jobs/TasksView.tsx
git commit -m "feat(jobs): /tasks page with live sections + controls"
```

---

## Task 17: Rewire generate/score/extract UI to enqueue

**Files:**
- Modify: `src/components/campaigns/GenerateModal.tsx`
- Modify: `src/components/generations/ScoreButton.tsx`
- Modify: `src/components/journal/JournalView.tsx`
- Modify: `src/components/generations/GenerationActions.tsx`

- [ ] **Step 1: `GenerateModal.tsx` — enqueue + toast + close.** Replace the `GenerationStream` usage. The `run`/`running` flow is replaced by a single enqueue handler. Concretely:
  - Remove the `GenerationStream` import and the `running ? <GenerationStream/> : …` branch.
  - Keep the template picker. Change the "Lancer la génération" button to:

```tsx
import { notifications } from "@mantine/notifications";
import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { generateCv, generateLm } from "@/server/actions/generations";
// …
const [pending, startTransition] = useTransition();
const router = useRouter();

function launch() {
  startTransition(async () => {
    try {
      const res =
        type === "CV"
          ? await generateCv({ templateName: selected, campaignId, language })
          : await generateLm({ templateName: selected, campaignId, language });
      notifications.show({
        color: "green",
        message: t("enqueued"), // "Ajouté à la file"
      });
      onClose();
      router.push("/tasks");
      void res;
    } catch (e) {
      notifications.show({
        color: "red",
        message: e instanceof Error ? e.message : "Échec",
      });
    }
  });
}
```

  Wire the launch button: `<Button loading={pending} onClick={launch}>`. Use a translation hook `const t = useTranslations("tasks");` (or inline strings consistent with the file's current style — the file currently uses hardcoded French strings, so you may keep `"Ajouté à la file d'attente"` inline to match existing style, but prefer i18n if the file is being modernized). Drop the `running` state and the "never close mid-generation" guard.

- [ ] **Step 2: `ScoreButton.tsx` — enqueue.** Replace the `scoreGeneration` call result handling:

```tsx
import { enqueueAtsScoringJob } from "@/server/actions/jobs";
// inside onClick transition:
await enqueueAtsScoringJob(generationId);
notifications.show({ color: "blue", message: "Scoring ajouté à la file" });
router.refresh();
```

(Remove the `import { scoreGeneration } from "@/server/ats/score";` — or keep using `scoreGeneration` since it now returns `{ jobId }`; either works. Prefer `enqueueAtsScoringJob` for clarity.)

- [ ] **Step 3: `JournalView.tsx` — enqueue extraction.** At the call site (`const { count } = await extractFactsFromEntry(entryId);`), change to:

```tsx
await extractFactsFromEntry(entryId); // now returns { jobId }
notifications.show({ color: "blue", message: "Extraction ajoutée à la file" });
```

Remove any UI that depended on the synchronous `count` (e.g. a toast showing the number of facts). The facts appear after the job runs; the reconciliation UI already reads them from the DB on refresh.

- [ ] **Step 4: `GenerationActions.tsx` — regenerate enqueues.** It uses `GenerationStream` with a `run` that calls `regenerateFromSnapshot`. Replace with an enqueue button:

```tsx
import { notifications } from "@mantine/notifications";
import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { regenerateFromSnapshot } from "@/server/actions/generations";
// replace the GenerationStream block with a button:
const [pending, startTransition] = useTransition();
const router = useRouter();
// onClick:
startTransition(async () => {
  try {
    await regenerateFromSnapshot(generationId);
    notifications.show({ color: "green", message: "Régénération ajoutée à la file" });
    router.push("/tasks");
  } catch (e) {
    notifications.show({ color: "red", message: e instanceof Error ? e.message : "Échec" });
  }
});
```

Read the current `GenerationActions.tsx` first to preserve surrounding layout/props.

- [ ] **Step 5: Delete the now-unused `GenerationStream.tsx`** if no references remain:

Run: `grep -rn "GenerationStream" src` → expect no matches after Steps 1 & 4.
If clean: `git rm src/components/generations/GenerationStream.tsx`.

- [ ] **Step 6: Typecheck**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components
git commit -m "feat(jobs): rewire generate/score/extract UI to enqueue"
```

---

## Task 18: i18n keys (fr + en)

**Files:**
- Modify: `messages/fr.json`, `messages/en.json`

- [ ] **Step 1: Add `nav.tasks`.** In both files, inside the `nav` object add:
  - fr: `"tasks": "Tâches"`
  - en: `"tasks": "Tasks"`

- [ ] **Step 2: Add a `tasks` namespace.** Append to `messages/fr.json`:

```json
  "tasks": {
    "title": "Tâches en arrière-plan",
    "running": "En cours",
    "queued": "En file d'attente",
    "finished": "Terminées",
    "none-running": "Aucune tâche en cours.",
    "none-queued": "Aucune tâche en attente.",
    "none-finished": "Aucune tâche terminée récemment.",
    "view-result": "Voir le résultat",
    "view-error": "Voir l'erreur",
    "retry": "Réessayer",
    "cancel": "Annuler",
    "enqueued": "Ajouté à la file d'attente",
    "attempt": "Essai {n}/{max}",
    "status": {
      "QUEUED": "En file",
      "RUNNING": "En cours",
      "SUCCEEDED": "Terminé",
      "FAILED": "Échoué",
      "CANCELLED": "Annulé"
    },
    "type": {
      "CV_GENERATION": "Génération CV",
      "LM_GENERATION": "Génération lettre de motivation",
      "FACT_EXTRACTION": "Extraction de faits",
      "ATS_SCORING": "Scoring ATS"
    }
  }
```

- [ ] **Step 3: Append the English equivalent** to `messages/en.json`:

```json
  "tasks": {
    "title": "Background tasks",
    "running": "Running",
    "queued": "Queued",
    "finished": "Finished",
    "none-running": "No running tasks.",
    "none-queued": "No queued tasks.",
    "none-finished": "No recently finished tasks.",
    "view-result": "View result",
    "view-error": "View error",
    "retry": "Retry",
    "cancel": "Cancel",
    "enqueued": "Added to the queue",
    "attempt": "Attempt {n}/{max}",
    "status": {
      "QUEUED": "Queued",
      "RUNNING": "Running",
      "SUCCEEDED": "Done",
      "FAILED": "Failed",
      "CANCELLED": "Cancelled"
    },
    "type": {
      "CV_GENERATION": "CV generation",
      "LM_GENERATION": "Cover letter generation",
      "FACT_EXTRACTION": "Fact extraction",
      "ATS_SCORING": "ATS scoring"
    }
  }
```

(Insert as a sibling top-level namespace; mind trailing commas/JSON validity.)

- [ ] **Step 4: Validate JSON**

Run: `bun -e "JSON.parse(require('fs').readFileSync('messages/fr.json','utf8')); JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 5: Commit**

```bash
git add messages/fr.json messages/en.json
git commit -m "i18n(jobs): tasks namespace + nav.tasks (fr/en)"
```

---

## Task 19: Env vars + final verification

**Files:**
- Modify: `src/lib/env.ts`, `.env.example`

- [ ] **Step 1: Parse the new env vars in `src/lib/env.ts`.** Add to `envSchema`:

```ts
  // Background jobs
  JOB_MAX_ATTEMPTS: z
    .string()
    .default("2")
    .transform((v) => Number.parseInt(v, 10)),
  JOB_POLL_INTERVAL_MS: z
    .string()
    .default("2000")
    .transform((v) => Number.parseInt(v, 10)),
```

(The queue/worker read `process.env` directly with the same defaults, so this is for documentation/validation symmetry. Optionally refactor them to import `env` — not required.)

- [ ] **Step 2: Document in `.env.example`:**

```bash
# Background job queue
JOB_MAX_ATTEMPTS=2
JOB_POLL_INTERVAL_MS=2000
```

- [ ] **Step 3: Full test suite**

Run: `bun test`
Expected: all tests pass (existing + `types.test.ts` + `queue.test.ts`).

- [ ] **Step 4: Production build**

Run: `bun run build`
Expected: build succeeds; `/tasks` and `/api/jobs/stream` appear in the route list; no type errors.

- [ ] **Step 5: End-to-end manual verification (both locales)**

With `AUTH_ENABLED=false`, `bun run dev`:
  1. `[jobs] worker starting` appears once in logs.
  2. Open `/fr/campaigns/:id`, click Generate CV → toast "Ajouté à la file", redirect to `/tasks`.
  3. `/tasks` shows the job moving QUEUED → RUNNING (progress bar + step) → SUCCEEDED with "Voir le résultat" linking to `/generations/:id`.
  4. Sidebar badge shows the active count and clears when done.
  5. Enqueue a job, click **Annuler** while QUEUED → it becomes CANCELLED.
  6. Force a failure (e.g. set LLM to a broken endpoint), confirm auto-retry then FAILED, **Voir l'erreur** shows the message, **Réessayer** re-queues.
  7. Repeat the happy path on `/en/...` to confirm English labels.

- [ ] **Step 6: Update CLAUDE.md note** — in `AGENTS.md` §2, change the "Pas de queue système en v1" line to reflect the implemented Postgres-backed in-process queue (one-line amendment referencing this plan/spec).

- [ ] **Step 7: Final commit**

```bash
git add src/lib/env.ts .env.example AGENTS.md
git commit -m "chore(jobs): env vars, docs, and CLAUDE.md queue note"
```

---

## Self-review notes (for the implementer)

- **Spec coverage:** queue storage (Task 1, 4), in-process sequential worker (Task 10, 11), cancel/retry/error/auto-retry (Task 4, 12, 16), SSE live UI (Task 13, 14), badge + `/tasks` page (Task 15, 16), four job types (Task 6–9), i18n (Task 18), env vars (Task 19). All spec sections map to tasks.
- **`requireUser` removal:** the worker path must never call `requireUser()`. Tasks 5–9 thread explicit users; if any moved code still imports `requireUser`, that's a bug — grep `src/server/jobs` for it and expect zero matches.
- **`revalidatePath` removal:** handlers run outside a request — they must not call `revalidatePath`. UI freshness comes from SSE + `router.refresh()`/`router.push`. Grep `src/server/jobs` for `revalidatePath` → expect zero.
- **Naming consistency:** `failOrRequeueJob`, `requestCancel`, `retryJob`, `recoverOrphans`, `claimNextJob`, `reportProgress`, `completeJob`, `markCancelled`, `isCancelRequested`, `listJobs`, `getJob`, `enqueueJob` — used identically across queue.ts, worker.ts, jobs.ts, route.ts.
- **Type consistency:** `JobSummary` shape is produced only by `toSummary()` and consumed by SSE route, JobsProvider, TasksView, Sidebar — single source in `types.ts`.
