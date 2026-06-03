import { Stack } from "@mantine/core";
import { setRequestLocale } from "next-intl/server";
import { EducationLanguages } from "@/components/profile/EducationLanguages";
import { ExperiencesList } from "@/components/profile/ExperiencesList";
import { IdentityHeader } from "@/components/profile/IdentityHeader";
import { PitchCard } from "@/components/profile/PitchCard";
import { ProjectsCard } from "@/components/profile/ProjectsCard";
import { SectionsGrid } from "@/components/profile/SectionsGrid";
import { SkillsCard } from "@/components/profile/SkillsCard";
import { TranslationSuggestionsPanel } from "@/components/profile/TranslationSuggestionsPanel";
import type { Locale, LocalizedText } from "@/lib/i18n";
import { getConsolidatedProfile } from "@/server/actions/profile";
import { listTranslationSuggestions } from "@/server/actions/translation-suggestions";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const profile = await getConsolidatedProfile();
  const translationSuggestions = await listTranslationSuggestions();

  const pitchSection = profile.sections.find((s) => s.sectionType === "pitch");
  const pitch: LocalizedText =
    (pitchSection?.contentMd as LocalizedText | null) ?? { fr: null, en: null };

  const yearsExperience = computeYearsExperience(profile.experiences);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1280, margin: "0 auto" }}>
      <IdentityHeader
        fullName={profile.identity?.fullName ?? "—"}
        yearsExperience={yearsExperience}
        location={profile.identity?.address ?? null}
        role={"Développeur fullstack senior"}
        handle={profile.identity?.handle ?? null}
        email={profile.identity?.email ?? null}
        phone={profile.identity?.phone ?? null}
        linkedinUrl={profile.identity?.linkedinUrl ?? null}
        githubUrl={profile.identity?.githubUrl ?? null}
        portfolioUrl={profile.identity?.portfolioUrl ?? null}
      />

      <TranslationSuggestionsPanel suggestions={translationSuggestions} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 380px",
          gap: 16,
          alignItems: "start",
        }}
      >
        <Stack gap="md">
          <PitchCard initialValue={pitch} />
          <SectionsGrid
            sections={profile.sections.map((s) => ({
              id: s.id,
              sectionType: s.sectionType,
              contentMd: s.contentMd as LocalizedText | null,
            }))}
            locale={locale as Locale}
          />
          <SkillsCard
            skills={profile.skills.map((s) => ({
              id: s.id,
              category: s.category,
              name: s.name,
              level: s.level,
            }))}
          />
          <EducationLanguages
            education={profile.education}
            languages={profile.skills
              .filter((s) => s.category === "languages-spoken")
              .map((s) => ({ id: s.id, name: s.name, level: s.level }))}
            locale={locale as Locale}
          />
          <ProjectsCard
            projects={profile.projects.map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              technologies: p.technologies,
              url: p.url,
              year: p.year,
            }))}
            locale={locale as Locale}
          />
        </Stack>

        <ExperiencesList experiences={profile.experiences} />
      </div>
    </div>
  );
}

function computeYearsExperience(
  experiences: { startDate: Date | string }[],
): number {
  if (experiences.length === 0) return 0;
  const start = experiences
    .map((e) =>
      typeof e.startDate === "string" ? new Date(e.startDate) : e.startDate,
    )
    .reduce((min, d) => (d < min ? d : min));
  const ms = Date.now() - start.getTime();
  return Math.max(0, Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000)));
}
