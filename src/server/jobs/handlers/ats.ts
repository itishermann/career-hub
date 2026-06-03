/**
 * Background handler — runs the 4-stage ATS pipeline and persists the score on
 * the Generation row. The scoring logic itself lives in `computeAtsScore`
 * (src/server/ats/compute.ts), shared with the CV improvement loop; this
 * handler only adapts it to the job context (explicit user, progress,
 * cancellation) and persists the result.
 */

import { computeAtsScore } from "@/server/ats/compute";
import { db } from "@/server/db";
import type { JobContext, JobUser } from "./context";

export async function runAtsScoring(
  user: JobUser,
  payload: { generationId: string },
  ctx: JobContext,
): Promise<{ global: number }> {
  const gen = await db.generation.findFirst({
    where: { id: payload.generationId, userId: user.id },
    include: { campaign: true },
  });
  if (!gen) throw new Error("Generation not found");

  const contextual = await computeAtsScore(
    {
      outputPdfPath: gen.outputPdfPath,
      outputTypst: gen.outputTypst,
      language: gen.language as "fr" | "en",
      campaign: gen.campaign
        ? { id: gen.campaign.id, jobDescription: gen.campaign.jobDescription }
        : null,
      rawLlmConfig: user.llmConfig,
      generationId: gen.id,
    },
    {
      reportProgress: ctx.reportProgress,
      throwIfCancelled: ctx.throwIfCancelled,
    },
  );

  await ctx.reportProgress("persist", 95);
  await db.generation.update({
    where: { id: gen.id },
    data: { atsScore: contextual as unknown as object },
  });

  await ctx.reportProgress("done", 100);
  return { global: contextual.global };
}
