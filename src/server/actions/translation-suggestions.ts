"use server";

import { revalidatePath } from "next/cache";
import type { Locale, LocalizedText } from "@/lib/i18n";
import { requireUser } from "@/server/auth-helpers";
import { db } from "@/server/db";
import type { TranslatableEntityType } from "@/server/jobs/types";

export type TranslationSuggestionView = {
  id: string;
  entityType: string;
  entityId: string;
  field: string;
  sourceLang: string;
  targetLang: string;
  sourceText: string;
  suggestedText: string;
  createdAt: string;
};

export async function listTranslationSuggestions(): Promise<
  TranslationSuggestionView[]
> {
  const user = await requireUser();
  const rows = await db.translationSuggestion.findMany({
    where: { userId: user.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map((r) => ({
    id: r.id,
    entityType: r.entityType,
    entityId: r.entityId,
    field: r.field,
    sourceLang: r.sourceLang,
    targetLang: r.targetLang,
    sourceText: r.sourceText,
    suggestedText: r.suggestedText,
    createdAt: r.createdAt.toISOString(),
  }));
}

/** Merge a translated value into an entity's localized field (target lang). */
async function writeTranslation(
  userId: string,
  entityType: TranslatableEntityType,
  entityId: string,
  field: string,
  targetLang: Locale,
  text: string,
): Promise<void> {
  const merge = (current: unknown): object => {
    const lt = (current ?? {}) as LocalizedText;
    return { ...lt, [targetLang]: text };
  };
  switch (entityType) {
    case "section": {
      const row = await db.profileSection.findFirst({
        where: { id: entityId, userId },
      });
      if (!row) throw new Error("Section not found");
      await db.profileSection.update({
        where: { id: entityId },
        data: { contentMd: merge(row.contentMd) },
      });
      return;
    }
    case "experience": {
      const row = await db.experience.findFirst({
        where: { id: entityId, userId },
      });
      if (!row) throw new Error("Experience not found");
      await db.experience.update({
        where: { id: entityId },
        data: { description: merge(row.description) },
      });
      return;
    }
    case "education": {
      const row = await db.education.findFirst({
        where: { id: entityId, userId },
      });
      if (!row) throw new Error("Education not found");
      await db.education.update({
        where: { id: entityId },
        data:
          field === "field"
            ? { field: merge(row.field) }
            : { diploma: merge(row.diploma) },
      });
      return;
    }
    case "project": {
      const row = await db.project.findFirst({
        where: { id: entityId, userId },
      });
      if (!row) throw new Error("Project not found");
      await db.project.update({
        where: { id: entityId },
        data: { description: merge(row.description) },
      });
      return;
    }
  }
}

export async function applyTranslationSuggestion(id: string): Promise<void> {
  const user = await requireUser();
  const s = await db.translationSuggestion.findFirst({
    where: { id, userId: user.id },
  });
  if (!s) throw new Error("Suggestion not found");
  if (s.status !== "PENDING") throw new Error("Suggestion already resolved");
  await writeTranslation(
    user.id,
    s.entityType as TranslatableEntityType,
    s.entityId,
    s.field,
    s.targetLang as Locale,
    s.suggestedText,
  );
  await db.translationSuggestion.update({
    where: { id },
    data: { status: "APPLIED", appliedAt: new Date() },
  });
  revalidatePath("/profile");
}

export async function rejectTranslationSuggestion(id: string): Promise<void> {
  const user = await requireUser();
  const s = await db.translationSuggestion.findFirst({
    where: { id, userId: user.id },
  });
  if (!s) throw new Error("Suggestion not found");
  await db.translationSuggestion.update({
    where: { id },
    data: { status: "REJECTED", rejectedAt: new Date() },
  });
  revalidatePath("/profile");
}
