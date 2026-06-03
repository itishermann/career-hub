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
