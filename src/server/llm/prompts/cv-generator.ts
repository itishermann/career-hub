/**
 * Prompt builder for the CV generator agent.
 *
 * Reads a profile snapshot + campaign brief + template Typst source and
 * produces the system + user prompts the LLM consumes. Output contract: a
 * single Typst source block (no preamble, no fences). The mock provider
 * returns canned Typst for the task tag `cv:typst:<lang>`.
 *
 * Prompt structure principle: instructions before data, data in
 * XML-like delimiters that won't be confused with Markdown or Typst, task
 * statement last (LLMs weight recent tokens more).
 *
 * The `ProfileSnapshotShape` uses already-picked single-language fields
 * (`string | null`), not `LocalizedText`. The caller is responsible for
 * resolving `LocalizedText` against the target language with fallback
 * before invoking this builder.
 */

import type { Locale } from "@/lib/i18n";
import type { AtsKeywords } from "./ats-keyword-extractor";

// ──────────────────────────────────────────────────────────────────────────
// Public types
// ──────────────────────────────────────────────────────────────────────────

/**
 * Feedback from a previous ATS-scored attempt, injected into a regeneration so
 * the model can close the gap to the target score. Built from the stored
 * `AtsContextualScore` of the source generation. Never asks the model to
 * invent — only to surface what is true and reorganise for relevance.
 */
export type CvImprovementFeedback = {
  previousScore: number;
  targetScore: number;
  /** Share (%) of JD keywords already present in the previous attempt, or null
   * when no keywords were available. Surfaced so the model sees the gap to the
   * 80% coverage target. */
  keywordCoverage: number | null;
  weaknesses: { title: string; detail: string }[];
  suggestions: {
    priority: "high" | "medium" | "low";
    section: string;
    suggestion: string;
    rationale: string;
  }[];
  missingKeywords: { keyword: string; importance: number; category: string }[];
};

export type CvPromptInput = {
  language: Locale;
  template: {
    name: string;
    typstSource: string;
    meta: TemplateMeta | unknown;
  };
  profileSnapshot: ProfileSnapshotShape;
  campaign?: {
    targetCompany?: string | null;
    targetRole?: string | null;
    jobDescription?: string | null;
  };
  journalExcerpts?: { content: string; createdAt: string }[];
  /**
   * Structured keywords extracted from the campaign's job description (cached
   * in CampaignAtsKeywords). Front-loaded into the prompt so the very first
   * generation already targets the JD's vocabulary — reducing the need for the
   * post-hoc improvement loop. Optional; omitted when no JD is available.
   */
  atsKeywords?: AtsKeywords | null;
  /**
   * Present only on a regeneration triggered by the "Améliorer" loop. Carries
   * the previous attempt's score and the ATS scorer's diagnostics so the model
   * can close the gap to the target.
   */
  improvement?: CvImprovementFeedback | null;
};

export type ProfileSnapshotShape = {
  identity: {
    fullName: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    linkedinUrl: string | null;
    githubUrl: string | null;
    portfolioUrl: string | null;
  };
  pitch: string | null;
  experiences: {
    company: string;
    role: string;
    status: string;
    location: string | null;
    startDate: string;
    endDate: string | null;
    description: string | null;
    achievements: string[];
    technologies: string[];
  }[];
  skillsByCategory: Record<string, string[]>;
  education: {
    school: string;
    diploma: string | null;
    field: string | null;
    location: string | null;
    startDate: string;
    endDate: string | null;
  }[];
  languages: { name: string; level: string | null }[];
  /**
   * Free-form narrative sections of the profile, keyed by section type.
   * Known keys: "voice", "anti_patterns", "interests", "preferences",
   * "differentiators", "anecdotes". Unknown keys are passed through.
   */
  sections: Record<string, string | null>;
};

/**
 * Loose shape for template metadata (see templates/meta.yaml). All
 * fields optional; we extract what we can opportunistically.
 */
type TemplateMeta = {
  name?: string;
  description?: string | Record<string, string>;
  template_language?: string;
  supported_languages?: string[];
  variables?: {
    name: string;
    type: string;
    default?: unknown;
    description?: string | Record<string, string>;
  }[];
  sections_supported?: string[];
  labels?: Record<string, Record<string, string>>;
};

// ──────────────────────────────────────────────────────────────────────────
// System prompts
// ──────────────────────────────────────────────────────────────────────────

const SYSTEM_FR = `Tu génères le code source Typst d'un CV à partir d'un profil et d'un template fournis dans le message utilisateur.

# Sortie attendue

- Tu produis UNIQUEMENT du code Typst valide, prêt à compiler avec \`typst compile\`.
- Pas de backticks, pas de blocs de code Markdown, pas de fence \`\`\`typst.
- Pas de préface ("Voici le CV..."), pas d'explication, pas de commentaire méta.
- Pas de balises de raisonnement (\`<think>\`, \`[reasoning]\`, ou équivalent). Si tu réfléchis, fais-le en silence avant de produire.
- La première ligne de ta sortie est soit un \`#import\`, soit un \`#set\`, soit du contenu Typst direct.

# Syntaxe Typst — pièges fréquents

Tu n'écris ni Markdown, ni CSS, ni LaTeX. Confusions interdites :

- \`## Titre\` (Markdown) → utiliser \`= Titre\` ou les helpers du template
- \`**gras**\` ou \`__gras__\` (Markdown) → utiliser \`*gras*\` (astérisque simple, c'est de la syntaxe Typst)
- \`margin-horizontal: 2cm\` (CSS) → utiliser \`#set page(margin: (x: 2cm))\`
- \`<br>\`, \`<p>\`, \`<div>\` (HTML) → utiliser \`\\\\\` pour un saut de ligne, ou \`#parbreak()\`
- \`\\documentclass{}\`, \`\\section{}\` (LaTeX) → n'a rien à faire ici

Caractères spéciaux à échapper avec un antislash quand ils apparaissent en littéral dans le texte : \`@\`, \`#\`, \`<\`, \`>\`. Un \`@\` non échappé est interprété comme une référence et casse la compilation.

Emails et URLs : toujours via \`#link("mailto:user@host")[user\\@host]\` et \`#link("https://...")\`. Jamais d'email en texte brut.

# Utilisation du template

Le template fourni définit la mise en page, les fontes, les couleurs et un ensemble de fonctions helpers (\`#let experience(...)\`, \`#let skill_group(...)\`, etc.).

- Tu UTILISES ces helpers tels qu'ils sont définis. Tu ne les redéfinis pas.
- Tu n'ajoutes pas de \`#set page(...)\`, \`#set text(...)\`, \`#show heading\` qui dupliquent ou écrasent le template.
- Si le template expose des variables (couleur d'accent, taille de police), utilise-les plutôt que de hardcoder.
- Si une fonction du template attend des paramètres nommés précis (\`#experience(role: ..., company: ..., dates: ...)\`), respecte exactement leurs noms.

# Contenu

- Anti-chronologique strict pour les expériences (la plus récente en haut).
- Sélectionne 4 à 5 expériences les plus pertinentes au poste cible. Garde une expérience ancienne pertinente si l'espace le permet (elle atteste de l'ancienneté).
- 3 à 5 puces par expérience récente, 1 à 3 pour les plus anciennes.
- Verbes d'action au passé pour les expériences terminées : "mis en place", "intégré", "migré", "conçu", "livré".
- Présent ou présent composé pour les expériences en cours : "conçois", "maintiens", "j'ai récemment livré".
- Chiffres, durées, échelles quand le profil les fournit. Jamais inventés.
- Dates au format \`Mois AAAA — Mois AAAA\` ou \`Depuis Mois AAAA\` pour les missions en cours.
- Longueur cible : 1 à 2 pages, idéalement 1,5 pour un profil senior.

# Adaptation au poste

Si une description de poste est fournie :

- Réordonne les puces et expériences pour mettre en avant ce qui matche le poste.
- Les technologies listées dans une expérience doivent venir du champ \`technologies\` de cette expérience dans le profil. Pas d'invention.
- **Objectif de couverture ATS : au moins 80% des mots-clés de l'offre doivent apparaître dans le CV, avec leur orthographe EXACTE.** Tu l'atteins en reformulant les expériences, compétences et réalisations RÉELLES du profil avec la terminologie de l'offre — pas en inventant. Beaucoup de mots-clés "manquants" sont en fait vrais mais formulés autrement : c'est ton travail de les faire apparaître avec les mots de l'offre.
- Seule raison valable de rester sous 80% : un mot-clé est factuellement faux pour le profil (compétence non maîtrisée, expérience inexistante). Dans ce cas tu l'omets — tu ne l'inventes JAMAIS. C'est l'unique exception.

# Langue

- Tu écris en français professionnel, sobre, factuel.
- Anglicismes techniques décomplexés acceptés ("fullstack", "monorepo", "pipeline", "scaler") — c'est le registre naturel d'un dev. Pas de francisation maladroite type "passage à l'échelle".
- Si un champ du profil est vide en français mais présent en anglais, traduis-le sans signaler la traduction dans la sortie.

# Anti-patterns interdits

Phrases-types creuses, à bannir intégralement :
- "passionné par", "force de proposition", "esprit d'équipe", "dynamique et motivé", "à l'écoute", "challenge stimulant"

Adjectifs auto-déclaratifs sur les soft skills :
- "rigoureux", "méthodique", "polyvalent", "autonome" — les démontrer par les faits dans les bullets, jamais les revendiquer en adjectif.

Éléments visuels :
- Pas de photo. Pas de barres de progression sur les compétences. Pas d'étoiles ou de jauges. Pas de pictogrammes décoratifs ajoutés au texte.

# Invention — règle absolue

Tu n'inventes JAMAIS : pas une expérience, pas une réalisation, pas une compétence, pas une date, pas une technologie, pas un chiffre, pas un client, pas un diplôme.

Si une section ne peut pas être remplie de façon honnête avec le contenu du profil, omets-la silencieusement plutôt que de la peupler avec du remplissage.`;

const SYSTEM_EN = `You generate Typst source for a CV from a profile and a template provided in the user message.

# Output contract

- Output ONLY valid Typst code, ready to compile with \`typst compile\`.
- No backticks, no Markdown code blocks, no \`\`\`typst fence.
- No preamble ("Here is the CV..."), no explanation, no meta commentary.
- No reasoning tags (\`<think>\`, \`[reasoning]\`, or equivalent). Think silently if you must, then produce.
- First line of output is either an \`#import\`, a \`#set\`, or Typst content directly.

# Typst syntax — common pitfalls

You are NOT writing Markdown, CSS, or LaTeX. Forbidden confusions:

- \`## Heading\` (Markdown) → use \`= Heading\` or the template helpers
- \`**bold**\` or \`__bold__\` (Markdown) → use \`*bold*\` (single asterisk is Typst syntax)
- \`margin-horizontal: 2cm\` (CSS) → use \`#set page(margin: (x: 2cm))\`
- \`<br>\`, \`<p>\`, \`<div>\` (HTML) → use \`\\\\\` for line break or \`#parbreak()\`
- \`\\documentclass{}\`, \`\\section{}\` (LaTeX) → wrong language

Special characters to backslash-escape when they appear as literals in text: \`@\`, \`#\`, \`<\`, \`>\`. An unescaped \`@\` is parsed as a reference and breaks compilation.

Emails and URLs: always via \`#link("mailto:user@host")[user\\@host]\` and \`#link("https://...")\`. Never email as plain text.

# Template usage

The provided template defines layout, fonts, colors and a set of helper functions (\`#let experience(...)\`, \`#let skill_group(...)\`, etc.).

- USE these helpers as defined. Do NOT redefine them.
- Do not add \`#set page(...)\`, \`#set text(...)\`, \`#show heading\` that duplicate or override the template.
- If the template exposes variables (accent color, font size), use them rather than hardcoding.
- If a template function expects named parameters (\`#experience(role: ..., company: ..., dates: ...)\`), respect their exact names.

# Content

- Strict reverse-chronological order for experience (most recent on top).
- Pick the 4 to 5 most relevant experiences to the target role. Keep an older relevant experience if space allows (it attests to tenure).
- 3 to 5 bullets per recent experience, 1 to 3 for older ones.
- Past-tense action verbs for completed experiences: "set up", "integrated", "migrated", "designed", "shipped".
- Present tense for ongoing roles: "lead", "maintain", "recently shipped".
- Numbers, durations, scale when the profile provides them. Never invented.
- Date format: \`Month YYYY — Month YYYY\` or \`Since Month YYYY\` for ongoing.
- Target length: 1 to 2 pages, ideally 1.5 for a senior profile.

# Job adaptation

If a job description is provided:

- Reorder bullets and experiences to surface what matches the role.
- Technologies listed for an experience must come from that experience's \`technologies\` field in the profile. No invention.
- **ATS coverage objective: at least 80% of the posting's keywords must appear in the CV, with their EXACT spelling.** Achieve it by rephrasing the profile's REAL experiences, skills and achievements with the posting's terminology — not by inventing. Many "missing" keywords are actually true but worded differently: your job is to surface them using the posting's words.
- The only valid reason to stay below 80%: a keyword is factually untrue for the profile (skill not mastered, experience that doesn't exist). In that case you omit it — you NEVER invent it. That is the sole exception.

# Language

- Professional, sober, factual English.
- If a profile field is empty in English but present in French, translate without signaling the translation in the output.

# Forbidden anti-patterns

Filler buzzwords, fully banned:
- "passionate about", "team player", "self-starter", "results-driven", "go-getter", "exciting challenge"

Self-declared soft-skill adjectives:
- "meticulous", "methodical", "versatile", "autonomous" — demonstrate them through facts in bullets, never claim them as adjectives.

Visual elements:
- No photo. No progress bars on skills. No star ratings or gauges. No decorative pictograms added to text.

# Invention — absolute rule

You NEVER invent: not an experience, not an achievement, not a skill, not a date, not a technology, not a number, not a client, not a degree.

If a section cannot be honestly filled from the profile, omit it silently rather than padding it.`;

// ──────────────────────────────────────────────────────────────────────────
// Locale-aware labels (used in user prompt scaffolding, not in CV output)
// ──────────────────────────────────────────────────────────────────────────

const LABELS = {
  fr: {
    targetCompany: "Entreprise cible",
    targetRole: "Poste visé",
    jobDescription: "Description du poste",
    noCampaign:
      "Aucune campagne fournie — produire un CV générique calibré sur le pitch et les expériences les plus polyvalentes.",
    journalIntro:
      "Extraits récents du journal de bord — context only, ne pas recopier dans le CV. Sert à calibrer le ton et repérer des réalisations récentes éventuellement absentes du profil consolidé.",
    voiceIntro:
      "Calibre ton style sur cette description de la voix de l'utilisateur :",
    antiPatternsIntro:
      "Respecte strictement ces anti-patterns spécifiques à l'utilisateur :",
    keywordsIntro:
      "Mots-clés de l'offre, par ordre d'importance (5 = critique). OBJECTIF FERME : au moins 80% de ces mots-clés doivent apparaître dans le CV, avec l'orthographe EXACTE de l'offre (synonymes entre crochets) pour passer les filtres ATS. Pour les intégrer, reformule les expériences et compétences RÉELLES du profil avec cette terminologie. Seule raison valable d'en omettre un : il est factuellement faux pour le profil — dans ce cas ne l'invente JAMAIS.",
    keywordsHard: "Compétences techniques",
    keywordsSoft: "Savoir-être",
    keywordsDomain: "Domaine",
    keywordsExperience: "Signaux d'expérience",
    improvementIntro: (prev: number, target: number, coverage: number | null) =>
      `Tentative précédente : score ATS ${prev}/100${coverage !== null ? `, couverture mots-clés ${coverage}%` : ""} (cible ${target}). Les retours ci-dessous sont OBLIGATOIRES : traite CHAQUE faiblesse et CHAQUE suggestion, une par une. OBJECTIF FERME : au moins 80% des mots-clés de l'offre doivent apparaître dans cette version, avec l'orthographe exacte de l'offre. Pour y arriver, reformule et fais ressortir les faits RÉELS du profil et du journal avec la terminologie de l'offre. Seule exception autorisée : un mot-clé factuellement faux pour le profil — tu ne l'inventes JAMAIS.`,
    improvementWeaknesses: "Faiblesses à corriger (obligatoire)",
    improvementSuggestions: "Suggestions priorisées (à appliquer)",
    improvementMissing:
      "Mots-clés manquants à INTÉGRER en priorité (reformule des faits vrais avec ces termes exacts ; n'en omets un que s'il est factuellement faux)",
    task: (lang: Locale) =>
      `Produis maintenant le code Typst complet du CV en ${lang === "fr" ? "français" : "anglais"}, prêt à compiler. La première ligne de ta sortie doit être directement du Typst (#import, #set, ou contenu). Aucun autre texte avant ou après.`,
  },
  en: {
    targetCompany: "Target company",
    targetRole: "Target role",
    jobDescription: "Job description",
    noCampaign:
      "No campaign provided — produce a generic CV calibrated on the pitch and the most versatile experiences.",
    journalIntro:
      "Recent journal excerpts — context only, do not copy into the CV. Use them to calibrate tone and surface recent achievements possibly absent from the consolidated profile.",
    voiceIntro: "Calibrate your style on this description of the user's voice:",
    antiPatternsIntro: "Strictly respect these user-specific anti-patterns:",
    keywordsIntro:
      "Job-posting keywords by importance (5 = critical). FIRM TARGET: at least 80% of these keywords must appear in the CV, using the posting's EXACT spelling (synonyms in brackets) to pass ATS filters. To include them, rephrase the profile's REAL experiences and skills with this terminology. The only valid reason to omit one: it is factually untrue for the profile — in that case never invent it.",
    keywordsHard: "Hard skills",
    keywordsSoft: "Soft skills",
    keywordsDomain: "Domain",
    keywordsExperience: "Experience signals",
    improvementIntro: (prev: number, target: number, coverage: number | null) =>
      `Previous attempt: ATS score ${prev}/100${coverage !== null ? `, keyword coverage ${coverage}%` : ""} (target ${target}). The feedback below is MANDATORY: address EVERY weakness and EVERY suggestion, one by one. FIRM TARGET: at least 80% of the posting's keywords must appear in this version, using the posting's exact spelling. To get there, rephrase and surface the REAL facts from the profile and journal with the posting's terminology. The only allowed exception: a keyword factually untrue for the profile — you NEVER invent it.`,
    improvementWeaknesses: "Weaknesses to fix (mandatory)",
    improvementSuggestions: "Prioritised suggestions (apply them)",
    improvementMissing:
      "Missing keywords to incorporate as a priority (rephrase true facts with these exact terms; omit one only if it is factually untrue)",
    task: (lang: Locale) =>
      `Now produce the full Typst source for the CV in ${lang === "fr" ? "French" : "English"}, ready to compile. The first line of your output must be Typst directly (#import, #set, or content). No other text before or after.`,
  },
} as const;

// ──────────────────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────────────────

const FR_MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

const EN_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Format an ISO date string to a human "Month YYYY" form, in the target
 * locale. Falls back to the raw input on parse failure.
 */
function formatDate(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const months = locale === "fr" ? FR_MONTHS : EN_MONTHS;
  const month = months[d.getUTCMonth()];
  const capitalized = month.charAt(0).toUpperCase() + month.slice(1);
  return `${capitalized} ${d.getUTCFullYear()}`;
}

/**
 * Format a date range with handling of ongoing missions.
 */
function formatDateRange(
  startIso: string,
  endIso: string | null,
  locale: Locale,
): string {
  const start = formatDate(startIso, locale);
  if (!endIso) {
    return locale === "fr" ? `Depuis ${start}` : `Since ${start}`;
  }
  const end = formatDate(endIso, locale);
  return `${start} — ${end}`;
}

/**
 * Type guard for TemplateMeta — checks whether a value plausibly fits the
 * shape. We use this loosely; consumers may use partial data.
 */
function looksLikeTemplateMeta(value: unknown): value is TemplateMeta {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Extract a compact description of variables and labels exposed by the
 * template's meta.yaml. Returns null if nothing useful is found.
 */
function describeTemplateMeta(
  meta: TemplateMeta | unknown,
  locale: Locale,
): string | null {
  if (!looksLikeTemplateMeta(meta)) return null;

  const lines: string[] = [];

  if (
    meta.variables &&
    Array.isArray(meta.variables) &&
    meta.variables.length > 0
  ) {
    lines.push(locale === "fr" ? "Variables exposées :" : "Exposed variables:");
    for (const v of meta.variables) {
      const desc =
        typeof v.description === "string"
          ? v.description
          : typeof v.description === "object" && v.description !== null
            ? ((v.description as Record<string, string>)[locale] ?? "")
            : "";
      const defaultStr =
        v.default !== undefined
          ? ` (default: ${JSON.stringify(v.default)})`
          : "";
      lines.push(
        `- \`${v.name}\` (${v.type})${defaultStr}${desc ? ` — ${desc}` : ""}`,
      );
    }
  }

  if (meta.labels && meta.labels[locale]) {
    lines.push(
      locale === "fr"
        ? "Labels à utiliser dans cette langue :"
        : "Labels to use in this language:",
    );
    for (const [key, value] of Object.entries(meta.labels[locale])) {
      lines.push(`- \`${key}\` → "${value}"`);
    }
  }

  return lines.length > 0 ? lines.join("\n") : null;
}

/**
 * Build a compact, LLM-friendly representation of the profile snapshot.
 *
 * We mix:
 * - Plain prose for identity and pitch (most natural for the LLM)
 * - JSON for structured data (experiences, education) so the LLM doesn't
 *   misparse irregular markdown
 * - Pre-formatted human dates ("Août 2021 — Décembre 2024") rather than
 *   raw ISO strings (more useful directly).
 */
function renderProfile(profile: ProfileSnapshotShape, locale: Locale): string {
  const id = profile.identity;
  const identityLines = [
    `Name: ${id.fullName}`,
    id.email ? `Email: ${id.email}` : null,
    id.phone ? `Phone: ${id.phone}` : null,
    id.address ? `Location: ${id.address}` : null,
    id.linkedinUrl ? `LinkedIn: ${id.linkedinUrl}` : null,
    id.githubUrl ? `GitHub: ${id.githubUrl}` : null,
    id.portfolioUrl ? `Portfolio: ${id.portfolioUrl}` : null,
  ]
    .filter((x): x is string => x !== null)
    .join("\n");

  const experiences = profile.experiences.map((e) => ({
    company: e.company,
    role: e.role,
    status: e.status,
    location: e.location,
    dates: formatDateRange(e.startDate, e.endDate, locale),
    ongoing: e.endDate === null,
    description: e.description,
    achievements: e.achievements,
    technologies: e.technologies,
  }));

  const education = profile.education.map((ed) => ({
    school: ed.school,
    diploma: ed.diploma,
    field: ed.field,
    location: ed.location,
    dates: formatDateRange(ed.startDate, ed.endDate ?? ed.startDate, locale),
  }));

  const skills = Object.entries(profile.skillsByCategory).map(
    ([category, items]) => ({
      category,
      items,
    }),
  );

  const blocks: string[] = [];

  blocks.push(`<identity>\n${identityLines}\n</identity>`);

  if (profile.pitch) {
    blocks.push(`<pitch>\n${profile.pitch.trim()}\n</pitch>`);
  }

  blocks.push(
    `<experiences>\n${JSON.stringify(experiences, null, 2)}\n</experiences>`,
  );
  blocks.push(`<skills>\n${JSON.stringify(skills, null, 2)}\n</skills>`);

  if (education.length > 0) {
    blocks.push(
      `<education>\n${JSON.stringify(education, null, 2)}\n</education>`,
    );
  }

  if (profile.languages.length > 0) {
    blocks.push(
      `<languages>\n${JSON.stringify(profile.languages, null, 2)}\n</languages>`,
    );
  }

  return blocks.join("\n\n");
}

/**
 * Pull narrative sections (voice, anti_patterns, interests) out of
 * `profile.sections` and present them prominently — these are
 * easy for the LLM to overlook if drowned in a JSON dump.
 */
function renderNarrativeSections(
  profile: ProfileSnapshotShape,
  locale: Locale,
): string {
  const labels = LABELS[locale];
  const sections = profile.sections;
  const blocks: string[] = [];

  if (sections.voice) {
    blocks.push(
      `<voice>\n${labels.voiceIntro}\n\n${sections.voice.trim()}\n</voice>`,
    );
  }

  if (sections.anti_patterns) {
    blocks.push(
      `<anti_patterns>\n${labels.antiPatternsIntro}\n\n${sections.anti_patterns.trim()}\n</anti_patterns>`,
    );
  }

  // Other sections (preferences, differentiators, interests, anecdotes) are
  // useful context but optional; surface them under a single tag if present.
  const other = Object.entries(sections)
    .filter(
      ([key, value]) =>
        value !== null &&
        value.trim() !== "" &&
        !["voice", "anti_patterns"].includes(key),
    )
    .map(([key, value]) => `### ${key}\n${(value as string).trim()}`);

  if (other.length > 0) {
    blocks.push(`<other_sections>\n${other.join("\n\n")}\n</other_sections>`);
  }

  return blocks.join("\n\n");
}

function renderTemplate(
  template: CvPromptInput["template"],
  locale: Locale,
): string {
  const metaDescription = describeTemplateMeta(template.meta, locale);

  const parts = [
    `<template name="${template.name}">`,
    metaDescription
      ? `<template_meta>\n${metaDescription}\n</template_meta>\n`
      : "",
    "<template_source>",
    template.typstSource,
    "</template_source>",
    "</template>",
  ].filter(Boolean);

  return parts.join("\n");
}

function renderCampaign(
  campaign: CvPromptInput["campaign"],
  locale: Locale,
): string {
  const labels = LABELS[locale];

  if (!campaign) {
    return `<campaign>\n${labels.noCampaign}\n</campaign>`;
  }

  const lines: string[] = [];
  if (campaign.targetCompany)
    lines.push(`${labels.targetCompany}: ${campaign.targetCompany}`);
  if (campaign.targetRole)
    lines.push(`${labels.targetRole}: ${campaign.targetRole}`);

  const intro = lines.join("\n");

  const jd = campaign.jobDescription
    ? `\n\n<job_description>\n${campaign.jobDescription.trim()}\n</job_description>`
    : "";

  return `<campaign>\n${intro || labels.noCampaign}${jd}\n</campaign>`;
}

function renderJournal(
  excerpts: CvPromptInput["journalExcerpts"],
  locale: Locale,
): string {
  if (!excerpts || excerpts.length === 0) return "";

  const labels = LABELS[locale];
  const entries = excerpts
    .map((j) => {
      const date = formatDate(j.createdAt, locale);
      return `- (${date}) ${j.content}`;
    })
    .join("\n");

  return `<journal_context>\n${labels.journalIntro}\n\n${entries}\n</journal_context>`;
}

/**
 * Render the JD-extracted keywords as a compact, importance-ordered block.
 * The instruction is strictly conditional ("only if true for the profile") so
 * the model never treats it as a list to stuff in regardless of truth.
 */
function renderKeywords(
  keywords: AtsKeywords | null | undefined,
  locale: Locale,
): string {
  if (!keywords) return "";
  const labels = LABELS[locale];

  const fmt = (
    items: { keyword: string; importance: number; synonyms?: string[] }[],
  ): string =>
    items
      .slice()
      .sort((a, b) => b.importance - a.importance)
      .map((k) => {
        const syn =
          k.synonyms && k.synonyms.length > 0
            ? ` [${k.synonyms.join(", ")}]`
            : "";
        return `- ${k.keyword}${syn} (${k.importance})`;
      })
      .join("\n");

  const groups: string[] = [];
  if (keywords.hard_skills.length > 0)
    groups.push(`${labels.keywordsHard}:\n${fmt(keywords.hard_skills)}`);
  if (keywords.soft_skills.length > 0)
    groups.push(`${labels.keywordsSoft}:\n${fmt(keywords.soft_skills)}`);
  if (keywords.domain_keywords.length > 0)
    groups.push(`${labels.keywordsDomain}:\n${fmt(keywords.domain_keywords)}`);
  if (keywords.experience_signals.length > 0)
    groups.push(
      `${labels.keywordsExperience}:\n${fmt(keywords.experience_signals)}`,
    );

  if (groups.length === 0) return "";

  return `<ats_keywords>\n${labels.keywordsIntro}\n\n${groups.join("\n\n")}\n</ats_keywords>`;
}

/**
 * Render the feedback from a previous ATS-scored attempt. Placed last (just
 * before the task) so the model weights it heavily, and framed as "fix without
 * inventing" to keep the honesty contract intact across regenerations.
 */
function renderImprovement(
  improvement: CvImprovementFeedback | null | undefined,
  locale: Locale,
): string {
  if (!improvement) return "";
  const labels = LABELS[locale];
  const blocks: string[] = [
    labels.improvementIntro(
      improvement.previousScore,
      improvement.targetScore,
      improvement.keywordCoverage,
    ),
  ];

  if (improvement.weaknesses.length > 0) {
    const w = improvement.weaknesses
      .map((x) => `- ${x.title}: ${x.detail}`)
      .join("\n");
    blocks.push(`${labels.improvementWeaknesses}:\n${w}`);
  }

  if (improvement.suggestions.length > 0) {
    const s = improvement.suggestions
      .slice()
      .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
      .map(
        (x) =>
          `- [${x.priority}] ${x.section}: ${x.suggestion} (${x.rationale})`,
      )
      .join("\n");
    blocks.push(`${labels.improvementSuggestions}:\n${s}`);
  }

  if (improvement.missingKeywords.length > 0) {
    const m = improvement.missingKeywords
      .slice()
      .sort((a, b) => b.importance - a.importance)
      .map((x) => `- ${x.keyword} (${x.importance})`)
      .join("\n");
    blocks.push(`${labels.improvementMissing}:\n${m}`);
  }

  return `<improvement_feedback>\n${blocks.join("\n\n")}\n</improvement_feedback>`;
}

function priorityRank(p: "high" | "medium" | "low"): number {
  return p === "high" ? 0 : p === "medium" ? 1 : 2;
}

// ──────────────────────────────────────────────────────────────────────────
// Public entry point
// ──────────────────────────────────────────────────────────────────────────

export function buildCvPrompt(input: CvPromptInput): {
  system: string;
  prompt: string;
} {
  const { language } = input;
  const system = language === "fr" ? SYSTEM_FR : SYSTEM_EN;
  const labels = LABELS[language];

  const blocks = [
    renderTemplate(input.template, language),
    renderProfile(input.profileSnapshot, language),
    renderNarrativeSections(input.profileSnapshot, language),
    renderCampaign(input.campaign, language),
    renderKeywords(input.atsKeywords, language),
    renderJournal(input.journalExcerpts, language),
    renderImprovement(input.improvement, language),
  ].filter((b) => b.length > 0);

  const prompt = [
    ...blocks,
    "",
    "<task>",
    labels.task(language),
    "</task>",
  ].join("\n\n");

  return { system, prompt };
}
