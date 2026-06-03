/**
 * Étage 4 — analyse contextuelle LLM. Produit un score global, des forces,
 * faiblesses et suggestions actionnables (cf. CLAUDE.md section 9).
 */

import { z } from "zod";
import type { AtsKeywords } from "./ats-keyword-extractor";

export const AtsContextualScoreSchema = z.object({
  global: z.number().int().min(0).max(100),
  breakdown: z.object({
    extraction: z.number().int().min(0).max(100),
    structure: z.number().int().min(0).max(100),
    keywords: z.number().int().min(0).max(100).nullable(),
    contextual: z.number().int().min(0).max(100),
  }),
  warnings: z.array(z.string()),
  strengths: z.array(z.object({ title: z.string(), detail: z.string() })),
  weaknesses: z.array(z.object({ title: z.string(), detail: z.string() })),
  suggestions: z.array(
    z.object({
      priority: z.enum(["high", "medium", "low"]),
      section: z.string(),
      suggestion: z.string(),
      rationale: z.string(),
    }),
  ),
  matchedKeywords: z.array(
    z.object({
      keyword: z.string(),
      count: z.number().int(),
      category: z.string(),
      importance: z.number().int().min(1).max(5),
    }),
  ),
  missingKeywords: z.array(
    z.object({
      keyword: z.string(),
      importance: z.number().int().min(1).max(5),
      category: z.string(),
    }),
  ),
});

export type AtsContextualScore = z.infer<typeof AtsContextualScoreSchema>;

export function buildAtsContextualPrompt(input: {
  cvText: string;
  jobDescription: string | null;
  keywords: AtsKeywords | null;
  extractionScore: number;
  structureScore: number;
  keywordScore: number | null;
  language: "fr" | "en";
}) {
  const system =
    input.language === "fr"
      ? `Tu es un agent qui audite un CV vs une description de poste sur la dimension ATS.
Tu produis un JSON conforme au schéma fourni — pas de paraphrase, pas de markdown autour.
Tu es sévère mais constructif. Tes suggestions sont actionnables et priorisées.`
      : `You are an agent auditing a CV against a job description for ATS quality.
Output JSON matching the provided schema — no paraphrase, no markdown wrapping.
Be tough but constructive. Suggestions must be actionable and prioritised.`;

  const prompt = [
    `## CV (texte extrait)`,
    input.cvText.slice(0, 8000),
    "",
    input.jobDescription
      ? `## Description du poste\n${input.jobDescription.slice(0, 5000)}`
      : "## Description du poste\nAucune — score les dimensions qualitatives seulement.",
    "",
    input.keywords
      ? `## Mots-clés extraits de la JD\n\`\`\`json\n${JSON.stringify(input.keywords)}\n\`\`\``
      : "",
    "",
    "## Sous-scores existants",
    `- extraction: ${input.extractionScore}`,
    `- structure: ${input.structureScore}`,
    `- keywords: ${input.keywordScore ?? "null"}`,
    "",
    "## Tâche",
    "Produis le JSON final. Reprends les sous-scores extraction/structure/keywords donnés, calcule contextual (0-100), puis global pondéré (extraction 15% + structure 25% + keywords 30% + contextual 30%).",
  ].join("\n");

  return { system, prompt };
}
