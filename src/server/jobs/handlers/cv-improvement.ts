/**
 * Background handler — the user-triggered "Améliorer" loop.
 *
 * Starting from a low-scoring CV generation, it regenerates the CV up to
 * `maxIterations` times, feeding each new attempt the previous attempt's ATS
 * diagnostics (weaknesses, suggestions, missing keywords) so the model closes
 * the gap to `targetScore`. It stops early the moment an attempt reaches the
 * target.
 *
 * Design choices (confirmed with the user):
 *  - EXPLICIT trigger only (a button), never an automatic retry baked into
 *    every generation — consistent with the recompile rule.
 *  - One immutable Generation row PER attempt (full traceability in history).
 *  - Each attempt is scored in-process via `computeAtsScore` (no nested job —
 *    the queue runs at concurrency 1).
 *  - The source profile snapshot is reused across attempts: only the prompt
 *    changes, so the comparison is a clean controlled experiment.
 */

import type { z } from "zod";
import { computeAtsScore } from "@/server/ats/compute";
import { getOrExtractCampaignKeywords } from "@/server/ats/keywords";
import { db } from "@/server/db";
import type { CvImprovementJobPayload as CvImprovementJobPayloadSchema } from "@/server/jobs/types";
import { getLlmProviderForUser, parseLlmConfig } from "@/server/llm/client";
import { extractTypstFromLlm } from "@/server/llm/extract-typst";
import type { AtsKeywords } from "@/server/llm/prompts/ats-keyword-extractor";
import type { AtsContextualScore } from "@/server/llm/prompts/ats-scorer";
import {
  buildCvPrompt,
  type CvImprovementFeedback,
  type ProfileSnapshotShape,
} from "@/server/llm/prompts/cv-generator";
import { sanitizeTypst } from "@/server/llm/sanitize-typst";
import { reportError } from "@/server/observability/report-error";
import {
  campaignQueryText,
  retrieveJournalContext,
} from "@/server/rag/retrieve";
import { isTypstAvailable } from "@/server/typst/compile";
import { compileWithRepair } from "@/server/typst/repair";
import type { JobContext, JobUser } from "./context";

type CvImprovementJobPayload = z.infer<typeof CvImprovementJobPayloadSchema>;

const DEFAULT_TARGET = 80;
const DEFAULT_MAX_ITERATIONS = 3;

function feedbackFromScore(
  score: AtsContextualScore,
  targetScore: number,
): CvImprovementFeedback {
  const matched = score.matchedKeywords?.length ?? 0;
  const missing = score.missingKeywords?.length ?? 0;
  const total = matched + missing;
  const keywordCoverage =
    total > 0 ? Math.round((matched / total) * 100) : null;
  return {
    previousScore: score.global,
    targetScore,
    keywordCoverage,
    weaknesses: score.weaknesses ?? [],
    suggestions: score.suggestions ?? [],
    missingKeywords: score.missingKeywords ?? [],
  };
}

export async function runCvImprovement(
  user: JobUser,
  payload: CvImprovementJobPayload,
  ctx: JobContext,
): Promise<{
  generationId: string;
  finalScore: number;
  startScore: number;
  iterations: number;
  reachedTarget: boolean;
}> {
  const targetScore = payload.targetScore ?? DEFAULT_TARGET;
  const maxIterations = payload.maxIterations ?? DEFAULT_MAX_ITERATIONS;

  const source = await db.generation.findFirst({
    where: { id: payload.generationId, userId: user.id },
    include: { template: true, campaign: true, profileSnapshot: true },
  });
  if (!source) throw new Error("Generation not found");
  if (source.type !== "CV")
    throw new Error("Only CV generations can be improved");
  const campaign = source.campaign;
  const jobDescription = campaign?.jobDescription;
  if (!campaign || !jobDescription)
    throw new Error(
      "Cannot improve without a campaign job description to score against",
    );
  if (!source.atsScore)
    throw new Error("Source generation must be ATS-scored before improving");
  if (!(await isTypstAvailable()))
    throw new Error(
      "Compilateur Typst natif indisponible sur cette plateforme.",
    );

  const language = source.language as "fr" | "en";
  const snapshot = source.profileSnapshot.snapshot as ProfileSnapshotShape;
  const llmConfig = parseLlmConfig(user.llmConfig);

  // Keywords (cached) — front-load them into every improvement attempt too.
  let atsKeywords: AtsKeywords | null = null;
  try {
    const { keywords } = await getOrExtractCampaignKeywords(
      campaign.id,
      jobDescription,
      language,
      user.llmConfig,
    );
    atsKeywords = keywords;
  } catch (err) {
    reportError(
      err,
      { scope: "generation", type: "CV", campaignId: campaign.id },
      "ATS keyword extraction failed during improvement (continuing without)",
    );
  }

  const journalExcerpts = await retrieveJournalContext({
    userId: user.id,
    rawLlmConfig: user.llmConfig,
    queryText: campaignQueryText(campaign),
    k: 10,
  });

  const startScore = (source.atsScore as unknown as AtsContextualScore).global;
  let feedback = feedbackFromScore(
    source.atsScore as unknown as AtsContextualScore,
    targetScore,
  );

  let bestId = source.id;
  let bestScore = startScore;
  let iterations = 0;
  let reachedTarget = startScore >= targetScore;

  for (let attempt = 1; attempt <= maxIterations && !reachedTarget; attempt++) {
    await ctx.throwIfCancelled();
    // Spread progress across the configured iterations.
    const base = Math.round((attempt - 1) * (90 / maxIterations)) + 5;
    await ctx.reportProgress(`iteration ${attempt}/${maxIterations}`, base);

    const { system, prompt } = buildCvPrompt({
      language,
      template: {
        name: source.template.name,
        typstSource: source.template.typstSource,
        meta: source.template.meta,
      },
      profileSnapshot: snapshot,
      campaign: {
        targetCompany: campaign.targetCompany,
        targetRole: campaign.targetRole,
        jobDescription,
      },
      atsKeywords,
      journalExcerpts,
      improvement: feedback,
    });

    const startedAt = Date.now();
    const provider = getLlmProviderForUser(
      user.llmConfig,
      `cv:typst:${language}`,
    );
    const llmResult = await provider.generateText({ system, prompt });
    const rawTypst = extractTypstFromLlm(llmResult.text);
    if (rawTypst.trim().length === 0) {
      // Dead attempt — don't persist an empty generation. Stop the loop and
      // keep the best so far.
      break;
    }
    const typstSource = sanitizeTypst(rawTypst);

    // Create the row first so the PDF filename keys off its unique id (the
    // source snapshot is shared across attempts, so we can't key off it).
    const generation = await db.generation.create({
      data: {
        userId: user.id,
        campaignId: campaign.id,
        templateId: source.templateId,
        profileSnapshotId: source.profileSnapshotId,
        type: "CV",
        language,
        llmProvider: llmConfig.mode,
        llmModel: provider.model,
        llmPrompt: prompt,
        outputTypst: typstSource,
        outputPdfPath: null,
        durationMs: Date.now() - startedAt,
        inputTokens: llmResult.usage.inputTokens,
        outputTokens: llmResult.usage.outputTokens,
        costCents: llmResult.usage.costCents ?? 0,
      },
    });
    iterations++;

    // Compile with recovery: deterministic sanitise, then up to 2 LLM repair
    // passes on the compiler diagnostic. A single malformed Typst no longer
    // wastes the attempt — only an unrecoverable one stops the loop.
    const compileResult = await compileWithRepair({
      source: typstSource,
      outputName: `cv-${generation.id}`,
      rawLlmConfig: user.llmConfig,
      language,
    });

    if (!compileResult.ok) {
      await db.generation.update({
        where: { id: generation.id },
        data: {
          outputTypst: compileResult.typstSource,
          compileError: compileResult.error,
        },
      });
      reportError(
        new Error(compileResult.error),
        { scope: "generation", type: "CV", generationId: generation.id },
        "Improvement attempt failed to compile even after repair — stopping loop",
      );
      // Repair exhausted → no scorable PDF, and the model keeps producing
      // broken Typst, so further iterations would likely repeat. Stop.
      break;
    }

    // The repaired source (if any) is what produced the PDF — store it so the
    // persisted Typst matches the rendered output.
    const finalTypst = compileResult.typstSource;

    // Score this attempt in-process and persist on its own row.
    const score = await computeAtsScore(
      {
        outputPdfPath: compileResult.pdfPath,
        outputTypst: finalTypst,
        language,
        campaign: { id: campaign.id, jobDescription },
        rawLlmConfig: user.llmConfig,
        generationId: generation.id,
      },
      { throwIfCancelled: ctx.throwIfCancelled },
    );

    await db.generation.update({
      where: { id: generation.id },
      data: {
        outputTypst: finalTypst,
        outputPdfPath: compileResult.pdfPath,
        atsScore: score as unknown as object,
      },
    });

    if (score.global > bestScore) {
      bestScore = score.global;
      bestId = generation.id;
    }
    if (score.global >= targetScore) {
      reachedTarget = true;
      break;
    }
    // Carry this attempt's diagnostics into the next iteration.
    feedback = feedbackFromScore(score, targetScore);
  }

  await ctx.reportProgress("done", 100);

  return {
    generationId: bestId,
    finalScore: bestScore,
    startScore,
    iterations,
    reachedTarget,
  };
}
