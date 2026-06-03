import type { z } from "zod";
import {
  buildProfileSnapshot,
  persistSnapshot,
} from "@/server/actions/snapshot";
import { db } from "@/server/db";
import type { LmJobPayload as LmJobPayloadSchema } from "@/server/jobs/types";
import { getLlmProviderForUser, parseLlmConfig } from "@/server/llm/client";
import { extractTypstFromLlm } from "@/server/llm/extract-typst";
import { buildLmPrompt } from "@/server/llm/prompts/lm-generator";
import { sanitizeTypst } from "@/server/llm/sanitize-typst";
import { reportError } from "@/server/observability/report-error";
import {
  campaignQueryText,
  retrieveJournalContext,
} from "@/server/rag/retrieve";
import { compileTypst, isTypstAvailable } from "@/server/typst/compile";
import type { JobContext, JobUser } from "./context";

type LmJobPayload = z.infer<typeof LmJobPayloadSchema>;

export async function runLmGeneration(
  user: JobUser,
  payload: LmJobPayload,
  ctx: JobContext,
): Promise<{ generationId: string; pdfAvailable: boolean; warning?: string }> {
  const template = await db.template.findUnique({
    where: { name: payload.templateName },
  });
  if (!template) throw new Error(`Template not found: ${payload.templateName}`);
  if (template.type !== "COVER_LETTER")
    throw new Error(
      `Template ${payload.templateName} is not a cover letter template`,
    );

  const campaign = await db.campaign.findFirst({
    where: { id: payload.campaignId, userId: user.id },
  });
  if (!campaign) throw new Error("Campaign not found");

  const language = payload.language ?? (campaign.targetLanguage as "fr" | "en");

  if (!template.supportedLanguages.includes(language)) {
    throw new Error(
      `Template ${template.name} does not support ${language} (supports ${template.supportedLanguages.join(", ")})`,
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
    `generation:lm:pending`,
    snapshot,
    user.id,
  );

  // 2. RAG — relevant journal excerpts (campaign always exists for an LM)
  await ctx.reportProgress("journal", 15);
  await ctx.throwIfCancelled();
  const journalExcerpts = await retrieveJournalContext({
    userId: user.id,
    rawLlmConfig: user.llmConfig,
    queryText: campaignQueryText(campaign),
    k: 10,
  });

  // 3. Build prompt
  await ctx.reportProgress("prompt", 20);
  const { system, prompt } = buildLmPrompt({
    language,
    template: {
      name: template.name,
      typstSource: template.typstSource,
      meta: template.meta,
    },
    profileSnapshot: snapshot,
    campaign: {
      targetCompany: campaign.targetCompany,
      targetRole: campaign.targetRole,
      jobDescription: campaign.jobDescription,
      contactName: campaign.contactName,
      contactEmail: campaign.contactEmail,
    },
    journalExcerpts,
  });

  // 4. LLM call
  await ctx.reportProgress("llm", 25);
  await ctx.throwIfCancelled();
  const llmConfig = parseLlmConfig(user.llmConfig);
  const provider = getLlmProviderForUser(
    user.llmConfig,
    `lm:typst:${language}`,
  );
  const llmResult = await provider.generateText({ system, prompt });
  // Strip any markdown code fence the model may have wrapped around the Typst
  // (see extract-typst.ts) so the compiler receives pure Typst.
  const rawTypst = extractTypstFromLlm(llmResult.text);

  // Never persist a dead generation: an empty Typst source means the model
  // produced nothing usable (e.g. a reasoning model that exhausted its context
  // on <think>). Fail loud with the provider's diagnostic instead.
  if (rawTypst.trim().length === 0) {
    throw new Error(
      `La génération a renvoyé un Typst vide (modèle ${provider.model}). Aucun PDF ne peut être produit — vérifie la configuration du modèle dans /settings/llm.`,
    );
  }

  // Deterministically repair literal `#` the model failed to escape before
  // compiling, and persist the repaired source. See sanitize-typst.ts.
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
      outputName: `lm-${profileSnapshotId}`,
      bucket: "generations",
    });
    if (compileResult.ok) {
      pdfPath = compileResult.pdfPath;
    } else {
      compileError = compileResult.error;
      warning = `Typst compilation failed:\n${compileResult.error.slice(0, 500)}`;
      reportError(
        new Error(compileResult.error),
        {
          scope: "generation",
          type: "COVER_LETTER",
          template: template.name,
          language,
          llmModel: provider.model,
          profileSnapshotId,
        },
        "Cover letter Typst compilation failed",
      );
    }
  } else {
    compileError = "Compilateur Typst natif indisponible sur cette plateforme.";
    warning = "Native Typst compiler unavailable on this platform.";
  }

  const generation = await db.generation.create({
    data: {
      userId: user.id,
      campaignId: campaign.id,
      templateId: template.id,
      profileSnapshotId,
      type: "COVER_LETTER",
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
