/**
 * Prompt builder for the cover letter (LM) generator.
 *
 * Calibrated on the profile's voice + anti-patterns. Strict 3-paragraph
 * structure as per CLAUDE.md section 7. Output: Typst source only.
 */

import type { Locale } from "@/lib/i18n";
import type { ProfileSnapshotShape } from "./cv-generator";

export type LmPromptInput = {
  language: Locale;
  template: { name: string; typstSource: string; meta: unknown };
  profileSnapshot: ProfileSnapshotShape;
  campaign: {
    targetCompany?: string | null;
    targetRole?: string | null;
    jobDescription?: string | null;
    contactName?: string | null;
    contactEmail?: string | null;
  };
  journalExcerpts?: { content: string; createdAt: string }[];
};

const SYSTEM_FR = `Tu es un agent qui génère le code Typst d'une lettre de motivation.

CONTRAINTES STRICTES :
- 3 paragraphes maximum :
  1. Accroche concrète (1 paragraphe)
  2. Adéquation au poste (1 paragraphe avec 1-2 réalisations chiffrées tirées du profil)
  3. Motivation contextuelle (1 paragraphe court)
- Signature : "Bien à vous," + nom. Jamais "Dans l'attente de votre retour, veuillez agréer…".
- Une anecdote MAX, piochée dans la section "anecdotes" du profil selon le ton.
- Toujours mentionner : disponibilité (selon le profil, ou immédiate si pertinent), modalité acceptée (remote / présentiel selon les préférences du profil).
- Pas de salaire dans la LM (sauf demande explicite).
- Pas de "Je me permets de", "Je serais ravi de", "Dynamique et motivé".
- Ton confiant sans être arrogant — écris comme un pair technique, pas comme un postulant.

Caractères spéciaux Typst : rends les emails et liens via #link("mailto:…") / #link("https://…"). N'écris JAMAIS un email en texte brut (un "@" littéral casse la compilation). Échappe tout @, #, <, > littéral avec un antislash.

SORTIE : UNIQUEMENT du Typst valide remplissant les placeholders du template fourni. Pas de backticks, pas d'explication.`;

const SYSTEM_EN = `You are an agent that generates the Typst source of a cover letter.

STRICT CONSTRAINTS:
- 3 paragraphs max:
  1. Concrete opening hook
  2. Fit with the role (1-2 quantified achievements from the profile)
  3. Brief motivation
- Signature: "Sincerely," + name. Never "I look forward to hearing from you" boilerplate.
- ONE anecdote max from the profile's "anecdotes" section, picked to match the role tone.
- Always state: availability (from the profile, or immediate if relevant), accepted modality (remote / on-site per the profile's preferences), Talent Passport if France-based role.
- No salary mention.
- No "I am writing to apply", "I would be delighted", "Dynamic and motivated".
- Confident peer tone — write as a technical peer, not a supplicant.

Typst special characters: render emails and links with #link("mailto:…") / #link("https://…"). NEVER write an email as plain text (a literal "@" breaks compilation). Backslash-escape any literal @, #, <, >.

OUTPUT: VALID TYPST ONLY filling the template's placeholders. No backticks, no explanation.`;

export function buildLmPrompt(input: LmPromptInput): {
  system: string;
  prompt: string;
} {
  const system = input.language === "fr" ? SYSTEM_FR : SYSTEM_EN;

  const prompt = [
    `## Langue de sortie : ${input.language.toUpperCase()}`,
    "",
    `## Template ${input.template.name}`,
    "```typst",
    input.template.typstSource,
    "```",
    "",
    "## Profil source",
    "```json",
    JSON.stringify(input.profileSnapshot, null, 2),
    "```",
    "",
    "## Campagne cible",
    `- Entreprise : ${input.campaign.targetCompany ?? "—"}`,
    `- Poste : ${input.campaign.targetRole ?? "—"}`,
    `- Contact : ${input.campaign.contactName ?? "—"}`,
    "",
    input.campaign.jobDescription
      ? `### Description du poste\n${input.campaign.jobDescription}`
      : "",
    "",
    input.journalExcerpts && input.journalExcerpts.length > 0
      ? [
          "## Extraits de journal pertinents (pour calibrer le ton et piocher des faits, ne pas recopier tel quel)",
          ...input.journalExcerpts.map(
            (j) => `- (${j.createdAt.slice(0, 10)}) ${j.content}`,
          ),
        ].join("\n")
      : "",
    "",
    "## Tâche",
    `Produis le code Typst complet de la lettre en ${input.language.toUpperCase()}, prêt à compiler.`,
    "Aucune autre sortie que le code Typst.",
  ].join("\n");

  return { system, prompt };
}
