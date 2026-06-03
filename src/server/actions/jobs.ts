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

async function enqueueFor(
  type: JobType,
  payload: unknown,
): Promise<{ jobId: string }> {
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

export async function enqueueCvImprovementJob(payload: {
  generationId: string;
  targetScore?: number;
  maxIterations?: number;
}): Promise<{ jobId: string }> {
  return enqueueFor("CV_IMPROVEMENT", payload);
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
