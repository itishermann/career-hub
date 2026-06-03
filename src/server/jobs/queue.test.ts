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

  test("requestCancel on a RUNNING job flags it instead of cancelling", async () => {
    const userId = await testUserId();
    const job = await enqueueJob(userId, "ATS_SCORING", { generationId: "g" });
    created.push(job.id);
    await db.job.update({ where: { id: job.id }, data: { status: "RUNNING", attempts: 1 } });
    await requestCancel(job.id, userId);
    const row = await db.job.findUnique({ where: { id: job.id } });
    expect(row?.status).toBe("RUNNING");
    expect(row?.cancelRequested).toBe(true);
    await db.job.update({ where: { id: job.id }, data: { status: "CANCELLED" } });
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
