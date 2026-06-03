// NOTE: not a Server Action module. These are internal helpers invoked
// in-process by the job worker (handlers/cv.ts, handlers/lm.ts) with an
// explicit user, so they must NOT be exposed as client-callable endpoints.
import type { Locale } from "@/lib/i18n";
import { pickLocalized, pickLocalizedArray } from "@/lib/i18n";
import { db } from "@/server/db";
import type { ProfileSnapshotShape } from "@/server/llm/prompts/cv-generator";

/**
 * Build an immutable, locale-resolved snapshot of the profile for downstream
 * generation. Stored as JSON on ProfileSnapshot rows so a regeneration months
 * later reproduces exactly the same input.
 */
export async function buildProfileSnapshot(
  language: Locale,
  account: { id: string; name: string | null; email: string },
): Promise<ProfileSnapshotShape> {
  const user = account;

  const [identity, sections, experiences, skills, education] = await Promise.all([
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
  ]);

  const sectionMap = new Map<string, string | null>();
  for (const s of sections) {
    sectionMap.set(
      s.sectionType,
      pickLocalized(s.contentMd as { fr?: string | null; en?: string | null }, language),
    );
  }

  const skillsByCategory: Record<string, string[]> = {};
  for (const s of skills) {
    if (s.category === "languages-spoken") continue;
    if (!skillsByCategory[s.category]) skillsByCategory[s.category] = [];
    skillsByCategory[s.category].push(s.name);
  }

  const languages = skills
    .filter((s) => s.category === "languages-spoken")
    .map((s) => ({ name: s.name, level: s.level }));

  return {
    identity: {
      fullName: identity?.fullName ?? user.name ?? user.email,
      email: identity?.email ?? user.email,
      phone: identity?.phone ?? null,
      address: identity?.address ?? null,
      linkedinUrl: identity?.linkedinUrl ?? null,
      githubUrl: identity?.githubUrl ?? null,
      portfolioUrl: identity?.portfolioUrl ?? null,
    },
    pitch: sectionMap.get("pitch") ?? null,
    experiences: experiences.map((e) => ({
      company: e.company,
      role: e.role,
      status: e.status,
      location: e.location,
      startDate: e.startDate.toISOString().slice(0, 10),
      endDate: e.endDate ? e.endDate.toISOString().slice(0, 10) : null,
      description: pickLocalized(
        e.description as { fr?: string | null; en?: string | null },
        language,
      ),
      achievements: pickLocalizedArray(
        e.achievements as { fr?: string[] | null; en?: string[] | null },
        language,
      ),
      technologies: e.technologies,
    })),
    skillsByCategory,
    education: education.map((edu) => ({
      school: edu.school,
      diploma: pickLocalized(edu.diploma as { fr?: string | null; en?: string | null }, language),
      field: pickLocalized(edu.field as { fr?: string | null; en?: string | null } | null, language),
      location: edu.location,
      startDate: edu.startDate.toISOString().slice(0, 10),
      endDate: edu.endDate ? edu.endDate.toISOString().slice(0, 10) : null,
    })),
    languages,
    sections: Object.fromEntries(sectionMap),
  };
}

export async function persistSnapshot(
  reason: string,
  snapshot: ProfileSnapshotShape,
  userId: string,
): Promise<string> {
  const row = await db.profileSnapshot.create({
    data: { userId, snapshot: snapshot as unknown as object, reason },
  });
  return row.id;
}
