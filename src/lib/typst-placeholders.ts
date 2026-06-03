/**
 * Template placeholder substitution for PREVIEW only.
 *
 * Template `.typ` sources contain `#PLACEHOLDER_*#` tokens. These are NOT
 * substituted by code at generation time — they are illustrative markers that
 * tell the LLM where each section goes (the generator produces the final Typst
 * from scratch, reusing the template's `#set/#show/#let` helpers).
 *
 * A raw template therefore is NOT valid Typst (`#PLACEHOLDER_NAME#` parses as
 * an undefined code expression). To preview a template in the editor we swap
 * each token for representative sample content so it actually compiles.
 *
 * Context note: tokens appear both in markup (`[ … #PLACEHOLDER_EMAIL# … ]`)
 * and inside string literals (`#link("https://" + "#PLACEHOLDER_*_HOST#")`).
 * Sample values are chosen to be inert in both: hosts have no special chars,
 * and the email escapes `@` as `\@` (markup would otherwise read `@example`
 * as a reference). All tokens here happen to sit in markup or string contexts
 * where that holds.
 */

const SAMPLE: Record<string, string> = {
  NAME: "Jean Dupont",
  TITLE: "Développeur Fullstack Senior",
  LOCATION: "Lyon, France",
  EMAIL: "jean.dupont\\@example.com",
  PHONE: "06 00 00 00 00",
  PORTFOLIO: "jeandupont.example.com",
  PORTFOLIO_HOST: "jeandupont.example.com",
  LINKEDIN: "linkedin.com/in/jeandupont",
  LINKEDIN_HOST: "linkedin.com/in/jeandupont",
  GITHUB: "github.com/jeandupont",
  GITHUB_HOST: "github.com/jeandupont",
  PITCH:
    "Développeur fullstack senior avec 8 ans d'expérience, spécialisé dans les applications web typées de bout en bout et les architectures self-hosted. J'aime livrer des produits sobres, accessibles et maintenables.",
  EXPERIENCES: [
    "== Lead Fullstack Developer, Helios Lab",
    "Lyon · 2021 – 2024",
    "",
    "- Plateforme SaaS multi-tenant conçue et livrée de bout en bout.",
    "- Encadrement d'une équipe de 4 développeurs.",
    "- Réduction de 40 % du temps de build CI.",
    "",
    "== Développeur Fullstack, Freelance",
    "Remote · 2018 – 2021",
    "",
    "- Applications React / Node pour divers clients.",
  ].join("\n"),
  EDUCATION: [
    "== Master Informatique, Université de Lyon",
    "2016 – 2018",
    "",
    "- Spécialité génie logiciel.",
  ].join("\n"),
  SKILLS: [
    "- Langages : TypeScript, Python, Go",
    "- Frameworks : React, Next.js, Node",
    "- Infrastructure : Docker, PostgreSQL, CI/CD",
  ].join("\n"),
  LANGUAGES: [
    "- Français : langue maternelle",
    "- Anglais : courant (C1)",
  ].join("\n"),
  INTERESTS: "Open source, escalade, cuisine.",
  // Cover-letter tokens
  DATE: "2 juin 2026",
  OBJET: "Candidature au poste de Développeur Fullstack Senior",
  OPENING: "Madame, Monsieur,",
  FIT_PARAGRAPH:
    "Votre offre a immédiatement retenu mon attention : l'alignement entre vos besoins techniques et mon parcours est fort, notamment sur les architectures web typées et self-hosted.",
  MOTIVATION_PARAGRAPH:
    "Rejoindre votre équipe représenterait pour moi l'occasion de contribuer à un produit ambitieux tout en partageant mon expérience du fullstack moderne.",
  RECIPIENT_NAME: "Mme Claire Martin",
  RECIPIENT_COMPANY: "Acme Corp",
  SENDER_NAME: "Jean Dupont",
  SENDER_LOCATION: "Lyon, France",
  SENDER_EMAIL: "jean.dupont\\@example.com",
};

const TOKEN_RE = /#PLACEHOLDER_([A-Z_]+)#/g;

/** True if the source still contains any `#PLACEHOLDER_*#` token. */
export function hasPlaceholders(source: string): boolean {
  TOKEN_RE.lastIndex = 0;
  return TOKEN_RE.test(source);
}

/**
 * Replace every `#PLACEHOLDER_KEY#` with sample content. Unknown keys fall back
 * to their humanized name so the document still compiles.
 */
export function fillTemplatePlaceholders(source: string): string {
  return source.replace(TOKEN_RE, (_match, key: string) => {
    if (key in SAMPLE) return SAMPLE[key];
    return key.toLowerCase().replace(/_/g, " ");
  });
}
