import type { z } from "zod";
import type { Locale, LocalizedText } from "@/lib/i18n";
import { db } from "@/server/db";
import type { TranslationJobPayload as TranslationJobPayloadSchema } from "@/server/jobs/types";
import { getLlmProviderForUser } from "@/server/llm/client";
import type { JobContext, JobUser } from "./context";

type TranslationJobPayload = z.infer<typeof TranslationJobPayloadSchema>;

function pickRaw(value: unknown, lang: Locale): string | null {
  const lt = value as LocalizedText | null | undefined;
  const v = lt?.[lang];
  return v && v.trim().length > 0 ? v : null;
}

/** Read the source-language text of a localized profile field, scoped to user. */
async function readSourceText(
  userId: string,
  payload: TranslationJobPayload,
): Promise<string | null> {
  const { entityType, entityId, field, sourceLang } = payload;
  switch (entityType) {
    case "section": {
      const row = await db.profileSection.findFirst({
        where: { id: entityId, userId },
      });
      return row ? pickRaw(row.contentMd, sourceLang) : null;
    }
    case "experience": {
      const row = await db.experience.findFirst({
        where: { id: entityId, userId },
      });
      if (!row) return null;
      // description is the only LocalizedText string field we translate here.
      return pickRaw(row.description, sourceLang);
    }
    case "education": {
      const row = await db.education.findFirst({
        where: { id: entityId, userId },
      });
      if (!row) return null;
      const value = field === "field" ? row.field : row.diploma;
      return pickRaw(value, sourceLang);
    }
    case "project": {
      const row = await db.project.findFirst({
        where: { id: entityId, userId },
      });
      return row ? pickRaw(row.description, sourceLang) : null;
    }
  }
}

/**
 * Produce a translation SUGGESTION for a localized profile field. Never writes
 * the translation onto the entity — the user validates it via the suggestions
 * UI (CLAUDE.md i18n rule). Re-running replaces any pending suggestion for the
 * same (entity, field, targetLang).
 */
export async function runTranslation(
  user: JobUser,
  payload: TranslationJobPayload,
  ctx: JobContext,
): Promise<{ suggestionId: string | null; skipped?: string }> {
  await ctx.reportProgress("load", 10);
  const sourceText = await readSourceText(user.id, payload);
  if (!sourceText) {
    // Source emptied/changed between enqueue and run — nothing to translate.
    await ctx.reportProgress("done", 100);
    return { suggestionId: null, skipped: "source text empty" };
  }

  await ctx.reportProgress("llm", 35);
  await ctx.throwIfCancelled();
  const provider = getLlmProviderForUser(
    user.llmConfig,
    `translate:${payload.entityType}.${payload.field}`,
  );
  const prompt = [
    `Translate the following ${payload.sourceLang.toUpperCase()} text into ${payload.targetLang.toUpperCase()}.`,
    `Context: professional profile field (${payload.entityType} / ${payload.field}).`,
    "Preserve register, density and technical jargon (no over-translation of anglicisms).",
    "Reply with ONLY the translated text, no preamble.",
    "",
    "---",
    sourceText,
  ].join("\n");
  const result = await provider.generateText({ prompt });
  const suggestedText = result.text.trim();
  if (suggestedText.length === 0) {
    throw new Error(
      `Translation returned empty text (model ${provider.model}).`,
    );
  }

  await ctx.reportProgress("store", 85);
  // Replace any pending suggestion for the same target so they don't pile up.
  await db.translationSuggestion.deleteMany({
    where: {
      userId: user.id,
      entityType: payload.entityType,
      entityId: payload.entityId,
      field: payload.field,
      targetLang: payload.targetLang,
      status: "PENDING",
    },
  });
  const suggestion = await db.translationSuggestion.create({
    data: {
      userId: user.id,
      entityType: payload.entityType,
      entityId: payload.entityId,
      field: payload.field,
      sourceLang: payload.sourceLang,
      targetLang: payload.targetLang,
      sourceText,
      suggestedText,
    },
  });

  await ctx.reportProgress("done", 100);
  return { suggestionId: suggestion.id };
}
