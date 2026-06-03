/**
 * Export a profile to a personality.md-compatible markdown document.
 *
 * Symmetrical to the seed format. Used for backup, sharing, archival, or
 * round-tripping through external tooling (LLM Desktop apps that prefer raw
 * markdown over MCP).
 */

"use server";

import type { Locale } from "@/lib/i18n";
import { pickLocalized, pickLocalizedArray } from "@/lib/i18n";
import { requireUser } from "@/server/auth-helpers";
import { db } from "@/server/db";

export async function exportProfileToMarkdown(language: Locale = "fr"): Promise<string> {
  const user = await requireUser();

  const [identity, sections, experiences, skills, education, projects] = await Promise.all([
    db.profileIdentity.findUnique({ where: { userId: user.id } }),
    db.profileSection.findMany({ where: { userId: user.id, isCurrent: true } }),
    db.experience.findMany({
      where: { userId: user.id },
      orderBy: [{ endDate: { sort: "desc", nulls: "first" } }, { startDate: "desc" }],
    }),
    db.skill.findMany({
      where: { userId: user.id },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    db.education.findMany({
      where: { userId: user.id },
      orderBy: { startDate: "desc" },
    }),
    db.project.findMany({ where: { userId: user.id }, orderBy: { year: "desc" } }),
  ]);

  const lines: string[] = [];
  const sectionMap = new Map<string, string | null>();
  for (const s of sections) {
    sectionMap.set(
      s.sectionType,
      pickLocalized(s.contentMd as { fr?: string | null; en?: string | null }, language),
    );
  }

  const title = identity?.fullName ?? user.name ?? user.email;
  lines.push(`# ${title}`, "");
  if (language === "fr") {
    lines.push("> Document de référence destiné à être exploité par Claude Code et autres LLMs pour générer CV, lettres de motivation, et accompagner la recherche d'emploi.", "");
  } else {
    lines.push("> Reference document for LLM-driven CV and cover letter generation.", "");
  }

  // 1. Identity ---------------------------------------------------------------
  lines.push(language === "fr" ? "## 1. Identité & contact" : "## 1. Identity & contact", "");
  if (identity) {
    lines.push("| Champ | Valeur |");
    lines.push("|---|---|");
    lines.push(`| Prénom / Nom | ${identity.fullName} |`);
    if (identity.birthDate)
      lines.push(`| Date de naissance | ${identity.birthDate.toISOString().slice(0, 10)} |`);
    if (identity.birthPlace) lines.push(`| Lieu de naissance | ${identity.birthPlace} |`);
    if (identity.nationality) lines.push(`| Nationalité | ${identity.nationality} |`);
    if (identity.residencyStatus) lines.push(`| Statut résident | ${identity.residencyStatus} |`);
    if (identity.address) lines.push(`| Adresse | ${identity.address} |`);
    if (identity.email) lines.push(`| Email | ${identity.email} |`);
    if (identity.phone) lines.push(`| Téléphone | ${identity.phone} |`);
    if (identity.linkedinUrl) lines.push(`| LinkedIn | ${identity.linkedinUrl} |`);
    if (identity.githubUrl) lines.push(`| GitHub | ${identity.githubUrl} |`);
    if (identity.portfolioUrl) lines.push(`| Portfolio | ${identity.portfolioUrl} |`);
    if (identity.mobility) lines.push(`| Mobilité | ${identity.mobility} |`);
    lines.push("");
  }

  // 2. Pitch ------------------------------------------------------------------
  const pitch = sectionMap.get("pitch");
  if (pitch) {
    lines.push(language === "fr" ? "## 2. Pitch professionnel" : "## 2. Professional pitch", "");
    lines.push(pitch, "");
  }

  // 3. Experiences -----------------------------------------------------------
  if (experiences.length > 0) {
    lines.push(language === "fr" ? "## 3. Parcours professionnel" : "## 3. Professional experience", "");
    for (const e of experiences) {
      const start = e.startDate.toISOString().slice(0, 7);
      const end = e.endDate ? e.endDate.toISOString().slice(0, 7) : language === "fr" ? "présent" : "present";
      lines.push(`### ${e.role} — ${e.company} (${start} → ${end})`);
      lines.push("");
      lines.push(`- **Statut** : ${e.status}`);
      if (e.location) lines.push(`- **Localisation** : ${e.location}`);
      const desc = pickLocalized(e.description as { fr?: string | null; en?: string | null }, language);
      if (desc) lines.push("", desc);
      const achievements = pickLocalizedArray(
        e.achievements as { fr?: string[] | null; en?: string[] | null },
        language,
      );
      if (achievements.length > 0) {
        lines.push("", language === "fr" ? "**Réalisations** :" : "**Achievements**:");
        for (const a of achievements) lines.push(`- ${a}`);
      }
      if (e.technologies.length > 0) {
        lines.push("", `_${language === "fr" ? "Stack" : "Stack"} : ${e.technologies.join(", ")}_`);
      }
      lines.push("");
    }
  }

  // 4. Skills ----------------------------------------------------------------
  if (skills.length > 0) {
    lines.push(language === "fr" ? "## 4. Compétences techniques" : "## 4. Technical skills", "");
    const grouped = new Map<string, string[]>();
    for (const s of skills) {
      if (!grouped.has(s.category)) grouped.set(s.category, []);
      grouped.get(s.category)!.push(s.level ? `${s.name} (${s.level})` : s.name);
    }
    for (const [cat, items] of grouped) {
      lines.push(`### ${cat}`);
      lines.push("- " + items.join(", "));
      lines.push("");
    }
  }

  // 5. Education --------------------------------------------------------------
  if (education.length > 0) {
    lines.push(language === "fr" ? "## 5. Formation" : "## 5. Education", "");
    lines.push("| Diplôme | École | Lieu | Période |");
    lines.push("|---|---|---|---|");
    for (const e of education) {
      const start = e.startDate.toISOString().slice(0, 7);
      const end = e.endDate ? e.endDate.toISOString().slice(0, 7) : "—";
      const dip = pickLocalized(e.diploma as { fr?: string | null; en?: string | null }, language) ?? "";
      lines.push(`| ${dip} | ${e.school} | ${e.location ?? ""} | ${start} – ${end} |`);
    }
    lines.push("");
  }

  // 6. Projects ---------------------------------------------------------------
  if (projects.length > 0) {
    lines.push(language === "fr" ? "## 6. Projets personnels" : "## 6. Personal projects", "");
    for (const p of projects) {
      lines.push(`### ${p.name} (${p.year})`);
      const desc = pickLocalized(p.description as { fr?: string | null; en?: string | null }, language);
      if (desc) lines.push("", desc);
      if (p.technologies.length > 0) {
        lines.push("", `_Stack : ${p.technologies.join(", ")}_`);
      }
      lines.push("");
    }
  }

  // 7+. Section blobs --------------------------------------------------------
  const SECTION_TITLES_FR: Record<string, string> = {
    soft_skills: "Soft skills & style de travail",
    preferences: "Préférences & critères",
    differentiators: "Différenciateurs clés",
    anecdotes: "Anecdotes signature",
    interests: "Centres d'intérêt",
    voice: "Voix d'écriture",
    anti_patterns: "Anti-patterns",
    instructions: "Instructions LLM",
  };
  const SECTION_TITLES_EN: Record<string, string> = {
    soft_skills: "Soft skills & work style",
    preferences: "Preferences & criteria",
    differentiators: "Key differentiators",
    anecdotes: "Signature anecdotes",
    interests: "Interests",
    voice: "Writing voice",
    anti_patterns: "Anti-patterns",
    instructions: "LLM instructions",
  };
  const titles = language === "fr" ? SECTION_TITLES_FR : SECTION_TITLES_EN;

  let idx = 7;
  for (const [key, title] of Object.entries(titles)) {
    const content = sectionMap.get(key);
    if (!content) continue;
    lines.push(`## ${idx}. ${title}`, "", content, "");
    idx++;
  }

  return lines.join("\n");
}
