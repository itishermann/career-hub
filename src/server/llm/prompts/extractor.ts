/**
 * Fact extractor agent. Reads a raw journal entry and proposes structured
 * facts (skills, achievements, preferences, profile/section updates) that the
 * user can reconcile into the consolidated profile.
 *
 * Directive, compact prompt — designed to work with smaller local models.
 */

import { z } from "zod";

export const ExtractedFactSchema = z.object({
  factType: z.string(),
  // Free-form structured payload (e.g. { name, category } for a skill).
  factContent: z.record(z.string(), z.unknown()),
  summary: z.string(),
});
export const ExtractedFactsSchema = z.object({
  facts: z.array(ExtractedFactSchema),
});
export type ExtractedFacts = z.infer<typeof ExtractedFactsSchema>;

export function buildExtractorPrompt(content: string, language: "fr" | "en") {
  const system =
    language === "fr"
      ? `Tu extrais des faits structurés d'une note de journal de carrière.
Types de faits possibles : "skill" (compétence), "achievement" (réalisation, idéalement chiffrée), "preference" (critère de recherche), "section_update" (mise à jour d'une section de profil).
Tu ne déduis QUE ce qui est explicitement dans la note. Pas d'invention.
Pour un "skill", factContent = { "name": ..., "category": "languages|frameworks|infrastructure|databases|testing|methodologies|compliance" }.
Pour les autres, factContent peut contenir les champs pertinents.
Chaque fait a un "summary" court en français.
Tu sors UNIQUEMENT du JSON conforme au schéma. Pas de texte autour.`
      : `You extract structured facts from a career journal note.
Possible fact types: "skill", "achievement" (ideally quantified), "preference" (search criterion), "section_update".
Only extract what is explicitly in the note. No invention.
For a "skill", factContent = { "name": ..., "category": "languages|frameworks|infrastructure|databases|testing|methodologies|compliance" }.
Each fact has a short "summary".
Output ONLY JSON matching the schema. No surrounding text.`;

  const prompt = [
    'Schéma : { "facts": [ { "factType": string, "factContent": object, "summary": string } ] }',
    "",
    "## Note de journal",
    content,
    "",
    "## Tâche",
    "Extraire les faits. S'il n'y a rien d'exploitable, renvoyer { \"facts\": [] }.",
  ].join("\n");

  return { system, prompt };
}
