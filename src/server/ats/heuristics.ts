/**
 * Structural heuristics — étage 2 du scoring ATS (cf. CLAUDE.md section 9).
 *
 * Réutilise le texte extrait par `extract.ts`. Retourne un sous-score 0-100
 * + une liste de warnings exploitable par l'UI.
 */

import type { AtsExtraction } from "./extract";

export type AtsHeuristicsResult = {
  score: number;
  warnings: string[];
  signals: {
    hasEmail: boolean;
    hasPhone: boolean;
    pages: number;
    charCount: number;
    accessibilityTags: boolean;
    bulletsCount: number;
  };
};

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE_RE = /(?:\+?\d[\s.-]?){8,}/;

export function scoreHeuristics(
  extraction: AtsExtraction,
  options: { language: "fr" | "en" } = { language: "fr" },
): AtsHeuristicsResult {
  const warnings: string[] = [];
  const text = extraction.text;
  let score = 60; // baseline — réajusté par les signaux

  const hasEmail = EMAIL_RE.test(text);
  const hasPhone = PHONE_RE.test(text);
  const pages = extraction.pageCount;
  const charCount = extraction.characterCount;
  const accessibilityTags = extraction.hasAccessibilityTags;
  const bulletsCount = (text.match(/[•·]/g) ?? []).length + (text.match(/\n\s*[-*]\s/g) ?? []).length;

  if (hasEmail) score += 5;
  else warnings.push(options.language === "fr" ? "Email absent ou illisible" : "Email missing or unreadable");

  if (hasPhone) score += 3;
  else warnings.push(options.language === "fr" ? "Téléphone absent ou illisible" : "Phone missing or unreadable");

  if (pages === 0) {
    score -= 30;
    warnings.push(
      options.language === "fr"
        ? "PDF illisible — extraction impossible"
        : "PDF unreadable — extraction failed",
    );
  } else if (pages <= 2) score += 5;
  else if (pages <= 3) score -= 5;
  else {
    score -= 15;
    warnings.push(
      options.language === "fr"
        ? `${pages} pages — limite recommandée : 2`
        : `${pages} pages — recommended limit: 2`,
    );
  }

  if (charCount < 800) {
    score -= 15;
    warnings.push(options.language === "fr" ? "Trop court (< 800 caractères)" : "Too short (< 800 chars)");
  }

  if (charCount > 8000) score -= 5;

  if (accessibilityTags) score += 8;
  else
    warnings.push(
      options.language === "fr"
        ? "Pas de tags PDF/UA — accessibilité ATS limitée"
        : "No PDF/UA tags — limited ATS accessibility",
    );

  if (bulletsCount < 5) score -= 5;

  return {
    score: Math.max(0, Math.min(100, score)),
    warnings,
    signals: {
      hasEmail,
      hasPhone,
      pages,
      charCount,
      accessibilityTags,
      bulletsCount,
    },
  };
}
