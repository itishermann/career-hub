/**
 * Prompt for the ATS keyword extractor agent.
 *
 * Reads a job description and produces a structured JSON of keywords (hard
 * skills, soft skills, domain keywords, experience signals) with importance
 * and synonyms. Cached at the campaign level (CampaignAtsKeywords) — see
 * CLAUDE.md section 9 étage 3.
 */

import { z } from "zod";

export const AtsKeywordsSchema = z.object({
  hard_skills: z.array(
    z.object({
      keyword: z.string(),
      importance: z.number().int().min(1).max(5),
      category: z.string(),
      synonyms: z.array(z.string()).default([]),
    }),
  ),
  soft_skills: z.array(
    z.object({
      keyword: z.string(),
      importance: z.number().int().min(1).max(5),
      synonyms: z.array(z.string()).default([]),
    }),
  ),
  domain_keywords: z.array(
    z.object({ keyword: z.string(), importance: z.number().int().min(1).max(5) }),
  ),
  experience_signals: z.array(
    z.object({ keyword: z.string(), importance: z.number().int().min(1).max(5) }),
  ),
});

export type AtsKeywords = z.infer<typeof AtsKeywordsSchema>;

export function buildAtsKeywordPrompt(jobDescription: string, language: "fr" | "en") {
  const system =
    language === "fr"
      ? `Tu es un extracteur de mots-clés ATS. Tu lis une description de poste et tu en extrais une structure JSON.
Tu ne paraphrases pas, tu ne juges pas. Tu sors UNIQUEMENT du JSON valide qui matche le schéma donné.`
      : `You are an ATS keyword extractor. Read a job description and produce a structured JSON.
Do not paraphrase, do not judge. Output ONLY valid JSON matching the given schema.`;

  const prompt = [
    `Schéma JSON attendu :
{
  "hard_skills":      [ { "keyword": string, "importance": 1..5, "category": "language|framework|tool|methodology", "synonyms": string[] } ],
  "soft_skills":      [ { "keyword": string, "importance": 1..5, "synonyms": string[] } ],
  "domain_keywords":  [ { "keyword": string, "importance": 1..5 } ],
  "experience_signals": [ { "keyword": string, "importance": 1..5 } ]
}`,
    "",
    "## Description du poste",
    jobDescription,
    "",
    "## Tâche",
    "Extraire le JSON. Pas d'explication.",
  ].join("\n");

  return { system, prompt };
}
