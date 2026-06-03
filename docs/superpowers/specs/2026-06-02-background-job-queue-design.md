# Background Job Queue — Design Spec

> Date: 2026-06-02
> Status: Approved (brainstorming) — pending implementation plan
> Branch: `feat/background-job-queue`

## 1. Goal

Move all long-running work off the request path into a durable background queue
with live progress tracking. In scope:

- CV generation (`generateCv`)
- Cover letter generation (`generateLm`)
- Journal fact extraction (`extractFactsFromEntry`)
- ATS scoring

Clicking **Generate CV** / **Generate cover letter** enqueues a job and returns
immediately. A dedicated **Tasks** page lists running/queued/recent jobs, and the
sidebar drawer shows a live badge of queued+running jobs.

## 2. Decisions (locked)

| Question | Decision |
|---|---|
| Where the worker runs | **In-process** (same Next.js server, started via `instrumentation.ts`) |
| Concurrency | **1 at a time** (sequential) — protects local single-GPU LLM endpoint |
| Job controls | Cancel queued, retry failed, view detailed error, **auto-retry 1–2×** |
| Live UI mechanism | **SSE** (real-time), backed by in-memory `EventEmitter` |
| Queue storage | **Postgres `Job` table** (`FOR UPDATE SKIP LOCKED`) — no Redis |

### Supersedes prior CLAUDE.md decisions

CLAUDE.md §2 states *"Pas de queue système en v1 — Server Actions avec
streaming."* and *"Pas de Redis en v1."* This feature intentionally supersedes
the first decision (per explicit user request) while **honoring** the no-Redis
constraint: the queue is Postgres-backed and the worker is in-process. CLAUDE.md
§2 should be updated when this ships.

## 3. Architecture & data flow

```
[Generate CV button] ──► enqueueJob() server action ──► INSERT Job(QUEUED) ──┐
                                                                              │ emits "wake"
                              ┌───────────────────────────────────────────────┘
                              ▼
        In-process worker loop (started once via instrumentation.ts)
        claim 1 job  →  FOR UPDATE SKIP LOCKED  →  RUNNING
                              │  reportProgress(step, %) ──► UPDATE Job + emit "job:update"
                              ▼
        dispatch by type → handler (cv | lm | fact-extraction | ats-scoring)
                              │
                       SUCCEEDED / FAILED / CANCELLED  ──► emit "job:update"

        EventEmitter (in-memory) ──► SSE route /api/jobs/stream ──► JobsProvider (client)
                                                                       ├─ drawer badge (count)
                                                                       └─ /tasks page (live list)
```

- **Queue = Postgres `Job` table.** Claiming uses `SELECT … FOR UPDATE SKIP
  LOCKED LIMIT 1` in a transaction → atomic, crash-safe.
- **Worker = single in-process loop**, started from `instrumentation.ts`
  (`register()`), guarded to `NEXT_RUNTIME === "nodejs"` and a module-level
  "already started" flag. Concurrency **1**.
- **Wake mechanism:** enqueue emits an in-memory event so the worker picks up
  immediately; a fallback poll (~2s, `JOB_POLL_INTERVAL_MS`) covers missed
  signals.
- **Crash recovery:** on worker startup, any `RUNNING` job is an orphan
  (concurrency 1, single instance) → reset to `QUEUED` if `attempts <
  maxAttempts`, else `FAILED`.

## 4. Data model (Prisma)

```prisma
model Job {
  id              String    @id @default(cuid())
  userId          String
  type            JobType
  status          JobStatus @default(QUEUED)
  payload         Json                     // typed per JobType, validated with Zod
  progress        Int       @default(0)    // 0–100
  step            String?                  // current step label
  result          Json?                    // e.g. { generationId } — links to output
  error           String?   @db.Text
  attempts        Int       @default(0)
  maxAttempts     Int       @default(2)    // 1 auto-retry by default (env-tunable)
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

enum JobType   { CV_GENERATION  LM_GENERATION  FACT_EXTRACTION  ATS_SCORING }
enum JobStatus { QUEUED  RUNNING  SUCCEEDED  FAILED  CANCELLED }
```

- `User` gains `jobs Job[]` relation.
- `result` carries the link back to the produced artifact (e.g. `generationId`)
  so a `/tasks` row deep-links to `/generations/:id`.
- `payload` is a discriminated union validated by Zod per type; handlers never
  trust raw JSON.
- One additive migration — no destructive change to existing tables.

### Payload schemas (Zod)

```ts
// CV_GENERATION
{ templateName: string, campaignId?: string, language?: "fr" | "en" }
// LM_GENERATION
{ templateName: string, campaignId: string, language?: "fr" | "en" }
// FACT_EXTRACTION
{ journalEntryId: string }
// ATS_SCORING
{ generationId: string }
```

## 5. Server modules

New `src/server/jobs/`:

- `types.ts` — `JobType`/`JobStatus` mirrors, payload Zod schemas, `JobSummary`
  DTO for SSE/UI.
- `queue.ts` — `enqueueJob()`, `claimNextJob()`, `completeJob()`, `failJob()`,
  `cancelJob()`, `requestCancel()`, `retryJob()`, `listJobs()`, `getJob()`.
- `worker.ts` — the loop, dispatch, orphan recovery, retry policy.
- `events.ts` — singleton `EventEmitter` (`job:update`, `wake`).
- `handlers/cv.ts`, `handlers/lm.ts`, `handlers/fact-extraction.ts`,
  `handlers/ats.ts` — each `(payload, ctx) => Promise<result>` where
  `ctx = { reportProgress(step, pct), throwIfCancelled() }`.

`instrumentation.ts` (project root) — `register()` starts the worker (nodejs
runtime only).

### Refactor of existing flows (wrap, don't rewrite)

The heavy pipeline currently inside `generateCv` / `generateLm` /
`extractFactsFromEntry` / ATS scoring moves into the handlers **with logic
unchanged**. The existing server actions become thin **enqueuers** returning
`{ jobId }`. All LLM access stays via `getLlmProviderForUser` (CLAUDE.md rule).

Cancellation is **cooperative**: `throwIfCancelled()` is checked between steps
(snapshot → RAG → prompt → LLM → compile → persist). A cancelled in-flight job
ends as `CANCELLED`; a still-queued job is cancelled directly in the action.

### Retry policy

- Auto-retry up to `maxAttempts` (default 2 → one retry; env `JOB_MAX_ATTEMPTS`).
- On failure with attempts remaining → back to `QUEUED`. Else `FAILED` with
  `error`.
- Manual **Retry** on a `FAILED` job re-queues it (resets `attempts` to 0).
- `CANCELLED` is terminal and never auto-retried.

### Progress steps (approximate)

- **CV/LM:** snapshot 5% → RAG 15% → prompt 20% → LLM 25→80% → Typst compile
  90% → persist 100%.
- **Fact extraction:** load entry 10% → LLM extract 30→80% → store facts 100%.
- **ATS scoring:** extract PDF text 20% → heuristics 35% → keywords 55% →
  contextual LLM 60→90% → persist score 100%.

## 6. SSE, live UI, pages & i18n

- **SSE route** `src/app/api/jobs/stream/route.ts`: auth user → `ReadableStream`;
  on connect sends a snapshot of the user's active/recent jobs, then forwards
  `job:update` events filtered by `userId`; 15s heartbeat; cleanup on disconnect.
- **`JobsProvider`** (client React context — not a global store lib, consistent
  with CLAUDE.md "no Redux/Zustand"): one `EventSource`, holds live jobs +
  derived counts, auto-reconnect on drop. Mounted in the `(app)` layout.
- **Drawer badge:** new **Tasks** nav item in `Sidebar.tsx` with a Mantine
  `Badge` = count of `QUEUED + RUNNING`.
- **`/tasks` page** (`src/app/[locale]/(app)/tasks/`): sections **En cours**
  (progress bar + step label), **En file**, **Terminées (récentes)**. Per-row
  controls: **Annuler** (queued / request-cancel running), **Réessayer**
  (failed), **Voir l'erreur** (failed, expandable). Success rows deep-link to the
  artifact (`/generations/:id`, journal entry, etc.).
- **i18n:** all labels via next-intl → new `tasks.*` keys in `messages/fr.json`
  and `messages/en.json`. Job type & status labels localized.

### UX change

Generate buttons switch from "wait inline, then show result" to "enqueue → toast
*Ajouté à la file* → result appears in `/generations` when done." The inline
`GenerationStream.tsx` wait UI is superseded by the `/tasks` live view (review
for removal/repurpose during implementation).

## 7. Environment variables

- `JOB_MAX_ATTEMPTS` (default `2`)
- `JOB_POLL_INTERVAL_MS` (default `2000`)

(`JOB_CONCURRENCY` intentionally omitted — fixed at 1 per YAGNI; add later if
needed.)

## 8. Testing (Bun test)

- `claimNextJob` atomicity under concurrent claims (`SKIP LOCKED` → no double
  claim).
- Retry transition (`RUNNING` fail → `QUEUED` while attempts remain → `FAILED`).
- Cancel transitions (queued → `CANCELLED`; running → cooperative `CANCELLED`).
- Orphan recovery on startup (`RUNNING` → `QUEUED`).
- One handler test with a mocked LLM provider.
- Zod payload validation (reject malformed payloads).
- SSE route + `/tasks` UI verified manually in both `fr` and `en`.

## 9. Out of scope (flagged)

- MCP `generate_*` tools switching to enqueue + a `job_get` tool — deferred to
  the MCP phase unless requested.
- Parallel worker concurrency / dedicated worker service — future option if
  throughput demands it.
- Update CLAUDE.md §2 to reflect the queue (doc task at ship time).
