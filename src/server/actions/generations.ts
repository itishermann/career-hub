"use server";

import { z } from "zod";
import { LocaleSchema } from "@/lib/i18n";
import { requireUser } from "@/server/auth-helpers";
import { db } from "@/server/db";
import { enqueueJob } from "@/server/jobs/queue";
import { isTypstAvailable } from "@/server/typst/compile";
import { compileWithRepair } from "@/server/typst/repair";

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

/**
 * User-triggered recompilation of a stored generation.
 *
 * Explicit-action only (a button) — never an automatic retry. Delegates the
 * sanitise → compile → LLM-repair loop to {@link compileWithRepair}, then
 * updates `outputPdfPath`, `outputTypst` (repaired) and `compileError` in
 * place. Returns whether a PDF was produced and the last error if not.
 */
export async function recompileGeneration(
  generationId: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const gen = await db.generation.findFirst({
    where: { id: generationId, userId: user.id },
    include: { template: true },
  });
  if (!gen) throw new Error("Generation not found");

  if (!(await isTypstAvailable())) {
    const error = "Compilateur Typst natif indisponible sur cette plateforme.";
    await db.generation.update({
      where: { id: gen.id },
      data: { compileError: error },
    });
    return { ok: false, error };
  }

  const result = await compileWithRepair({
    source: gen.outputTypst,
    outputName: `${gen.type === "CV" ? "cv" : "lm"}-${gen.id}`,
    rawLlmConfig: user.llmConfig,
    language: gen.language,
  });

  if (result.ok) {
    await db.generation.update({
      where: { id: gen.id },
      data: {
        outputTypst: result.typstSource,
        outputPdfPath: result.pdfPath,
        compileError: null,
      },
    });
    // The client refreshes the route after this resolves (router.refresh),
    // which re-reads outputPdfPath and renders the PDF preview.
    return { ok: true };
  }

  await db.generation.update({
    where: { id: gen.id },
    data: { outputTypst: result.typstSource, compileError: result.error },
  });
  return { ok: false, error: result.error };
}
