import type { z } from "zod";
import {
  buildProfileSnapshot,
  persistSnapshot,
} from "@/server/actions/snapshot";
import { getOrExtractCampaignKeywords } from "@/server/ats/keywords";
import { db } from "@/server/db";
import type { CvJobPayload as CvJobPayloadSchema } from "@/server/jobs/types";
import { getLlmProviderForUser, parseLlmConfig } from "@/server/llm/client";
import { extractTypstFromLlm } from "@/server/llm/extract-typst";
import type { AtsKeywords } from "@/server/llm/prompts/ats-keyword-extractor";
import { buildCvPrompt } from "@/server/llm/prompts/cv-generator";
import { sanitizeTypst } from "@/server/llm/sanitize-typst";
import { reportError } from "@/server/observability/report-error";
import {
  campaignQueryText,
  retrieveJournalContext,
} from "@/server/rag/retrieve";
import { compileTypst, isTypstAvailable } from "@/server/typst/compile";
import type { JobContext, JobUser } from "./context";

type CvJobPayload = z.infer<typeof CvJobPayloadSchema>;

export async function runCvGeneration(
  user: JobUser,
  payload: CvJobPayload,
  ctx: JobContext,
): Promise<{ generationId: string; pdfAvailable: boolean; warning?: string }> {
  const template = await db.template.findUnique({
    where: { name: payload.templateName },
  });
  if (!template) throw new Error(`Template not found: ${payload.templateName}`);
  if (template.type !== "CV")
    throw new Error(`Template ${payload.templateName} is not a CV template`);

  const campaign = payload.campaignId
    ? await db.campaign.findFirst({
        where: { id: payload.campaignId, userId: user.id },
      })
    : null;

  const language =
    payload.language ?? (campaign?.targetLanguage as "fr" | "en") ?? "fr";

  if (!template.supportedLanguages.includes(language)) {
    throw new Error(
      `Template ${template.name} does not support language ${language} (supports ${template.supportedLanguages.join(", ")})`,
    );
  }

  const startedAt = Date.now();

  // 1. Snapshot
  await ctx.reportProgress("snapshot", 5);
  await ctx.throwIfCancelled();
  const snapshot = await buildProfileSnapshot(language, {
    id: user.id,
    name: user.name,
    email: user.email,
  });
  const profileSnapshotId = await persistSnapshot(
    `generation:cv:pending`,
    snapshot,
    user.id,
  );

  // 2. RAG — relevant journal excerpts (best-effort; empty if no campaign/journal)
  await ctx.reportProgress("journal", 15);
  await ctx.throwIfCancelled();
  const journalExcerpts = campaign
    ? await retrieveJournalContext({
        userId: user.id,
        rawLlmConfig: user.llmConfig,
        queryText: campaignQueryText(campaign),
        k: 10,
      })
    : [];

  // 2b. ATS keywords — extract (cached per campaign) and front-load into the
  // prompt so the first attempt already targets the JD vocabulary. Best effort:
  // a keyword-extraction failure must never block the generation itself.
  let atsKeywords: AtsKeywords | null = null;
  if (campaign?.jobDescription) {
    try {
      const { keywords } = await getOrExtractCampaignKeywords(
        campaign.id,
        campaign.jobDescription,
        language,
        user.llmConfig,
      );
      atsKeywords = keywords;
    } catch (err) {
      reportError(
        err,
        { scope: "generation", type: "CV", campaignId: campaign.id },
        "ATS keyword pre-extraction failed (generating without keyword front-loading)",
      );
    }
  }

  // 3. Build prompt
  await ctx.reportProgress("prompt", 20);
  const { system, prompt } = buildCvPrompt({
    language,
    template: {
      name: template.name,
      typstSource: template.typstSource,
      meta: template.meta,
    },
    profileSnapshot: snapshot,
    campaign: campaign
      ? {
          targetCompany: campaign.targetCompany,
          targetRole: campaign.targetRole,
          jobDescription: campaign.jobDescription,
        }
      : undefined,
    atsKeywords,
    journalExcerpts,
  });

  // 4. LLM call
  await ctx.reportProgress("llm", 25);
  await ctx.throwIfCancelled();
  const llmConfig = parseLlmConfig(user.llmConfig);
  const provider = getLlmProviderForUser(
    user.llmConfig,
    `cv:typst:${language}`,
  );
  const llmResult = await provider.generateText({ system, prompt });
  // Some models wrap the output in a markdown fence (```typst …```); strip it
  // so the compiler gets pure Typst instead of rendering the source as a raw
  // block. See extract-typst.ts.
  const rawTypst = extractTypstFromLlm(llmResult.text);

  // Never persist a dead generation: an empty Typst source means the model
  // produced nothing usable (e.g. a reasoning model that exhausted its context
  // on <think>). Fail loud with the provider's diagnostic instead.
  if (rawTypst.trim().length === 0) {
    throw new Error(
      `La génération a renvoyé un Typst vide (modèle ${provider.model}). Aucun PDF ne peut être produit — vérifie la configuration du modèle dans /settings/llm.`,
    );
  }

  // Deterministically repair literal `#` the model failed to escape (the
  // classic `C#` → "expected expression" parse break). Small models ignore the
  // escaping instruction in the prompt, so we fix it before compiling and
  // persist the repaired source so the stored Typst matches the produced PDF.
  // See sanitize-typst.ts.
  const typstSource = sanitizeTypst(rawTypst);

  // 5. Compile Typst (best effort — native compiler, warn if unavailable)
  await ctx.reportProgress("typst", 85);
  await ctx.throwIfCancelled();
  let pdfPath: string | null = null;
  let warning: string | undefined;
  let compileError: string | null = null;
  if (await isTypstAvailable()) {
    const compileResult = await compileTypst({
      source: typstSource,
      outputName: `cv-${profileSnapshotId}`,
      bucket: "generations",
    });
    if (compileResult.ok) {
      pdfPath = compileResult.pdfPath;
    } else {
      compileError = compileResult.error;
      warning = `Typst compilation failed — Typst source saved, PDF unavailable.\n${compileResult.error.slice(0, 500)}`;
      reportError(
        new Error(compileResult.error),
        {
          scope: "generation",
          type: "CV",
          template: template.name,
          language,
          llmModel: provider.model,
          profileSnapshotId,
        },
        "CV Typst compilation failed",
      );
    }
  } else {
    compileError = "Compilateur Typst natif indisponible sur cette plateforme.";
    warning =
      "Native Typst compiler unavailable on this platform — Typst source saved, PDF unavailable.";
  }

  const generation = await db.generation.create({
    data: {
      userId: user.id,
      campaignId: campaign?.id,
      templateId: template.id,
      profileSnapshotId,
      type: "CV",
      language,
      llmProvider: llmConfig.mode,
      llmModel: provider.model,
      llmPrompt: prompt,
      outputTypst: typstSource,
      outputPdfPath: pdfPath,
      compileError,
      durationMs: Date.now() - startedAt,
      inputTokens: llmResult.usage.inputTokens,
      outputTokens: llmResult.usage.outputTokens,
      costCents: llmResult.usage.costCents ?? 0,
    },
  });

  await ctx.reportProgress("done", 100);

  return {
    generationId: generation.id,
    pdfAvailable: pdfPath !== null,
    warning,
  };
}
