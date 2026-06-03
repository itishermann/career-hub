/**
 * Pure ATS scoring core — the 4-stage pipeline (extraction → heuristics →
 * keyword match → contextual LLM) with graceful degradation, returning the
 * `AtsContextualScore` WITHOUT persisting it.
 *
 * Shared by:
 *  - the ATS_SCORING job handler (handlers/ats.ts), which persists the result
 *    on the Generation row;
 *  - the CV improvement loop (handlers/cv-improvement.ts), which scores each
 *    freshly compiled attempt in-process to decide whether to iterate.
 *
 * It must stay free of the job queue (no enqueue) so the improvement loop can
 * call it synchronously — the queue runs at concurrency 1 and a nested job
 * would deadlock the single drain loop.
 */

import { extractPdfText, extractTypstText } from "@/server/ats/extract";
import { scoreHeuristics } from "@/server/ats/heuristics";
import {
  getOrExtractCampaignKeywords,
  matchKeywordsAgainst,
} from "@/server/ats/keywords";
import { getLlmProviderForUser } from "@/server/llm/client";
import type { AtsKeywords } from "@/server/llm/prompts/ats-keyword-extractor";
import {
  type AtsContextualScore,
  AtsContextualScoreSchema,
  buildAtsContextualPrompt,
} from "@/server/llm/prompts/ats-scorer";
import { reportError } from "@/server/observability/report-error";

export type AtsScoreInputs = {
  outputPdfPath: string | null;
  outputTypst: string;
  language: "fr" | "en";
  campaign: { id: string; jobDescription: string | null } | null;
  rawLlmConfig: unknown;
  /** For error-report context only. */
  generationId?: string;
};

export type AtsScoreHooks = {
  reportProgress?: (step: string, pct: number) => Promise<void> | void;
  throwIfCancelled?: () => Promise<void> | void;
};

async function progress(
  hooks: AtsScoreHooks | undefined,
  step: string,
  pct: number,
): Promise<void> {
  await hooks?.reportProgress?.(step, pct);
}

export async function computeAtsScore(
  inputs: AtsScoreInputs,
  hooks?: AtsScoreHooks,
): Promise<AtsContextualScore> {
  const { language } = inputs;

  // 1. Extract text (prefer PDF, fall back to Typst source).
  await progress(hooks, "extract", 20);
  let extraction = inputs.outputPdfPath
    ? await extractPdfText(inputs.outputPdfPath)
    : {
        ok: false as const,
        text: "",
        characterCount: 0,
        pageCount: 0,
        hasAccessibilityTags: false,
      };
  if (!extraction.ok) {
    extraction = extractTypstText(inputs.outputTypst);
  }
  const extractionScore = extraction.ok ? 95 : 0;

  // 2. Structural heuristics.
  await progress(hooks, "heuristics", 35);
  const heuristics = scoreHeuristics(extraction, { language });
  const structureScore = heuristics.score;

  // 3. Keyword extraction + match (only with a job description).
  await progress(hooks, "keywords", 55);
  let keywordScore: number | null = null;
  let matchedKeywords: AtsContextualScore["matchedKeywords"] = [];
  let missingKeywords: AtsContextualScore["missingKeywords"] = [];
  let keywords: AtsKeywords | null = null;

  if (inputs.campaign?.jobDescription) {
    try {
      const { keywords: k } = await getOrExtractCampaignKeywords(
        inputs.campaign.id,
        inputs.campaign.jobDescription,
        language,
        inputs.rawLlmConfig,
      );
      keywords = k;
      const match = matchKeywordsAgainst(extraction.text, keywords);
      keywordScore = match.score;
      matchedKeywords = match.matched;
      missingKeywords = match.missing;
    } catch (err) {
      reportError(
        err,
        { scope: "ats", generationId: inputs.generationId },
        "ATS keyword extraction failed (continuing without keyword score)",
      );
    }
  }

  // 4. Contextual analysis (LLM).
  await progress(hooks, "contextual", 60);
  await hooks?.throwIfCancelled?.();
  const provider = getLlmProviderForUser(inputs.rawLlmConfig, "ats:score");
  const { system, prompt } = buildAtsContextualPrompt({
    cvText: extraction.text,
    jobDescription: inputs.campaign?.jobDescription ?? null,
    keywords,
    extractionScore,
    structureScore,
    keywordScore,
    language,
  });

  let contextual: AtsContextualScore;
  try {
    const result = await provider.generateJson({
      system,
      prompt,
      schema: AtsContextualScoreSchema,
    });
    contextual = result.data;
  } catch (err) {
    // Synthesise a minimal score from the deterministic sub-scores so the
    // pipeline always returns something usable.
    console.warn(
      "[ats] contextual LLM failed, falling back to deterministic synthesis:",
      err,
    );
    contextual = {
      global: Math.round(
        extractionScore * 0.15 +
          structureScore * 0.25 +
          (keywordScore ?? 60) * 0.3 +
          60 * 0.3,
      ),
      breakdown: {
        extraction: extractionScore,
        structure: structureScore,
        keywords: keywordScore,
        contextual: 60,
      },
      warnings: heuristics.warnings,
      strengths: [],
      weaknesses: [],
      suggestions: [],
      matchedKeywords,
      missingKeywords,
    };
  }

  // Merge keyword data the LLM may have dropped.
  if (matchedKeywords.length > 0 && contextual.matchedKeywords.length === 0) {
    contextual.matchedKeywords = matchedKeywords;
  }
  if (missingKeywords.length > 0 && contextual.missingKeywords.length === 0) {
    contextual.missingKeywords = missingKeywords;
  }
  contextual.warnings = [
    ...new Set([...contextual.warnings, ...heuristics.warnings]),
  ];

  return contextual;
}
