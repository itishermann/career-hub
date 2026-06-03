/**
 * Étage 3 du scoring ATS — match des mots-clés extraits depuis la JD contre
 * le contenu du CV.
 *
 * Le cache des keywords vit dans `CampaignAtsKeywords` ; `jdHash` invalide
 * automatiquement si la JD change.
 */

import { createHash } from "node:crypto";
import { db } from "@/server/db";
import { getLlmProviderForUser } from "@/server/llm/client";
import {
  AtsKeywordsSchema,
  type AtsKeywords,
  buildAtsKeywordPrompt,
} from "@/server/llm/prompts/ats-keyword-extractor";

export function hashJd(jd: string): string {
  return createHash("sha256").update(jd).digest("hex");
}

export async function getOrExtractCampaignKeywords(
  campaignId: string,
  jd: string,
  language: "fr" | "en",
  rawLlmConfig: unknown,
): Promise<{ keywords: AtsKeywords; cached: boolean }> {
  const jdHash = hashJd(jd);
  const existing = await db.campaignAtsKeywords.findUnique({ where: { campaignId } });
  if (existing && existing.jdHash === jdHash) {
    return { keywords: existing.keywords as AtsKeywords, cached: true };
  }

  const provider = getLlmProviderForUser(rawLlmConfig, "ats:keywords");
  const { system, prompt } = buildAtsKeywordPrompt(jd, language);
  const result = await provider.generateJson({
    system,
    prompt,
    schema: AtsKeywordsSchema,
  });

  await db.campaignAtsKeywords.upsert({
    where: { campaignId },
    update: {
      jdHash,
      keywords: result.data as object,
      llmProvider: provider.mode,
      llmModel: provider.model,
      extractedAt: new Date(),
    },
    create: {
      campaignId,
      jdHash,
      keywords: result.data as object,
      llmProvider: provider.mode,
      llmModel: provider.model,
    },
  });

  return { keywords: result.data as AtsKeywords, cached: false };
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

export type KeywordMatchResult = {
  score: number;
  matched: { keyword: string; count: number; category: string; importance: number }[];
  missing: { keyword: string; importance: number; category: string }[];
};

export function matchKeywordsAgainst(text: string, kw: AtsKeywords): KeywordMatchResult {
  const lower = text.toLowerCase();
  const matched: KeywordMatchResult["matched"] = [];
  const missing: KeywordMatchResult["missing"] = [];

  type Entry = { keyword: string; synonyms: string[]; importance: number; category: string };
  const all: Entry[] = [
    ...kw.hard_skills.map((s) => ({
      keyword: s.keyword,
      synonyms: s.synonyms ?? [],
      importance: s.importance,
      category: s.category,
    })),
    ...kw.soft_skills.map((s) => ({
      keyword: s.keyword,
      synonyms: s.synonyms ?? [],
      importance: s.importance,
      category: "soft",
    })),
    ...kw.domain_keywords.map((s) => ({
      keyword: s.keyword,
      synonyms: [],
      importance: s.importance,
      category: "domain",
    })),
    ...kw.experience_signals.map((s) => ({
      keyword: s.keyword,
      synonyms: [],
      importance: s.importance,
      category: "experience",
    })),
  ];

  let weighted = 0;
  let total = 0;

  for (const entry of all) {
    total += entry.importance;
    const variants = [entry.keyword, ...entry.synonyms]
      .map((v) => v.toLowerCase())
      .filter((v) => v.length >= 2);
    let count = 0;
    for (const variant of variants) {
      const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matches = lower.match(new RegExp(`\\b${escaped}\\b`, "g"));
      count += matches?.length ?? 0;
    }
    if (count > 0) {
      matched.push({
        keyword: entry.keyword,
        count,
        category: entry.category,
        importance: entry.importance,
      });
      weighted += entry.importance;
    } else {
      missing.push({
        keyword: entry.keyword,
        importance: entry.importance,
        category: entry.category,
      });
    }
  }

  const score = total === 0 ? null : Math.round((weighted / total) * 100);
  return {
    score: score ?? 0,
    matched,
    missing: missing.sort((a, b) => b.importance - a.importance),
  };
}
