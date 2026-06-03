"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { LocalizedStringArraySchema, LocalizedTextSchema } from "@/lib/i18n";
import { requireUser } from "@/server/auth-helpers";
import { db } from "@/server/db";
import { publishDomainEvent } from "@/server/events/domain-events";

const STATUS_VALUES = ["freelance", "salarie", "alternance", "stage"] as const;

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

const UpdateIdentityInput = z.object({
  fullName: z.string().min(1).optional(),
  birthDate: z.string().nullish(),
  birthPlace: z.string().nullish(),
  nationality: z.string().nullish(),
  residencyStatus: z.string().nullish(),
  address: z.string().nullish(),
  email: z.string().email().nullish(),
  phone: z.string().nullish(),
  linkedinUrl: z.string().nullish(),
  githubUrl: z.string().nullish(),
  portfolioUrl: z.string().nullish(),
  handle: z.string().nullish(),
  mobility: z.string().nullish(),
  drivingLicence: z.string().nullish(),
});

export async function updateIdentity(
  input: z.infer<typeof UpdateIdentityInput>,
) {
  const user = await requireUser();
  const data = UpdateIdentityInput.parse(input);
  await db.profileIdentity.upsert({
    where: { userId: user.id },
    update: {
      ...data,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
    },
    create: {
      userId: user.id,
      fullName: data.fullName ?? user.name ?? user.email,
      ...data,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
    },
  });
  revalidatePath("/profile");
}

// ---------------------------------------------------------------------------
// Profile sections
// ---------------------------------------------------------------------------

const SECTION_TYPES = [
  "pitch",
  "soft_skills",
  "preferences",
  "anti_patterns",
  "voice",
  "interests",
  "differentiators",
  "anecdotes",
  "instructions",
] as const;

const UpsertSectionInput = z.object({
  sectionType: z.enum(SECTION_TYPES),
  contentMd: LocalizedTextSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function upsertProfileSection(
  input: z.infer<typeof UpsertSectionInput>,
) {
  const user = await requireUser();
  const parsed = UpsertSectionInput.parse(input);

  const existing = await db.profileSection.findFirst({
    where: {
      userId: user.id,
      sectionType: parsed.sectionType,
      isCurrent: true,
    },
  });

  let sectionId: string;
  if (existing) {
    await db.profileSection.update({
      where: { id: existing.id },
      data: {
        contentMd: parsed.contentMd as object,
        metadata: parsed.metadata as object | undefined,
      },
    });
    sectionId = existing.id;
  } else {
    const created = await db.profileSection.create({
      data: {
        userId: user.id,
        sectionType: parsed.sectionType,
        contentMd: parsed.contentMd as object,
        metadata: parsed.metadata as object | undefined,
        isCurrent: true,
        version: 1,
      },
    });
    sectionId = created.id;
  }
  revalidatePath("/profile");
  await publishDomainEvent({
    type: "profile.localized.updated",
    userId: user.id,
    entityType: "section",
    entityId: sectionId,
    fields: { contentMd: parsed.contentMd },
  });
}

// ---------------------------------------------------------------------------
// Experiences
// ---------------------------------------------------------------------------

const ExperienceInput = z.object({
  id: z.string().optional(),
  company: z.string().min(1),
  role: z.string().min(1),
  status: z.enum(STATUS_VALUES),
  location: z.string().nullish(),
  startDate: z.string().min(1),
  endDate: z.string().nullish(),
  description: LocalizedTextSchema,
  achievements: LocalizedStringArraySchema,
  technologies: z.array(z.string()),
});

export async function upsertExperience(input: z.infer<typeof ExperienceInput>) {
  const user = await requireUser();
  const data = ExperienceInput.parse(input);
  const payload = {
    userId: user.id,
    company: data.company,
    role: data.role,
    status: data.status,
    location: data.location ?? null,
    startDate: new Date(data.startDate),
    endDate: data.endDate ? new Date(data.endDate) : null,
    description: data.description as object,
    achievements: data.achievements as object,
    technologies: data.technologies,
  };
  let experienceId: string;
  if (data.id) {
    await db.experience.update({ where: { id: data.id }, data: payload });
    experienceId = data.id;
  } else {
    const created = await db.experience.create({ data: payload });
    experienceId = created.id;
  }
  revalidatePath("/profile");
  await publishDomainEvent({
    type: "profile.localized.updated",
    userId: user.id,
    entityType: "experience",
    entityId: experienceId,
    fields: { description: data.description },
  });
}

export async function deleteExperience(id: string) {
  const user = await requireUser();
  await db.experience.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/profile");
}

// ---------------------------------------------------------------------------
// Skills, Education, Projects — light CRUD
// ---------------------------------------------------------------------------

const SkillInput = z.object({
  id: z.string().optional(),
  category: z.string().min(1),
  name: z.string().min(1),
  level: z.string().nullish(),
  yearsExperience: z.number().nullish(),
});

export async function upsertSkill(input: z.infer<typeof SkillInput>) {
  const user = await requireUser();
  const data = SkillInput.parse(input);
  if (data.id) {
    await db.skill.update({
      where: { id: data.id },
      data: {
        category: data.category,
        name: data.name,
        level: data.level ?? null,
        yearsExperience: data.yearsExperience ?? null,
      },
    });
  } else {
    await db.skill.upsert({
      where: {
        userId_category_name: {
          userId: user.id,
          category: data.category,
          name: data.name,
        },
      },
      update: {
        level: data.level ?? null,
        yearsExperience: data.yearsExperience ?? null,
      },
      create: {
        userId: user.id,
        category: data.category,
        name: data.name,
        level: data.level ?? null,
        yearsExperience: data.yearsExperience ?? null,
      },
    });
  }
  revalidatePath("/profile");
}

export async function deleteSkill(id: string) {
  const user = await requireUser();
  await db.skill.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/profile");
}

const EducationInput = z.object({
  id: z.string().optional(),
  school: z.string().min(1),
  diploma: LocalizedTextSchema,
  field: LocalizedTextSchema.optional(),
  location: z.string().nullish(),
  startDate: z.string().min(1),
  endDate: z.string().nullish(),
});

export async function upsertEducation(input: z.infer<typeof EducationInput>) {
  const user = await requireUser();
  const data = EducationInput.parse(input);
  const payload = {
    userId: user.id,
    school: data.school,
    diploma: data.diploma as object,
    field: data.field ? (data.field as object) : undefined,
    location: data.location ?? null,
    startDate: new Date(data.startDate),
    endDate: data.endDate ? new Date(data.endDate) : null,
  };
  let educationId: string;
  if (data.id) {
    await db.education.update({ where: { id: data.id }, data: payload });
    educationId = data.id;
  } else {
    const created = await db.education.create({ data: payload });
    educationId = created.id;
  }
  revalidatePath("/profile");
  await publishDomainEvent({
    type: "profile.localized.updated",
    userId: user.id,
    entityType: "education",
    entityId: educationId,
    fields: data.field
      ? { diploma: data.diploma, field: data.field }
      : { diploma: data.diploma },
  });
}

export async function deleteEducation(id: string) {
  const user = await requireUser();
  await db.education.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/profile");
}

const ProjectInput = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: LocalizedTextSchema,
  technologies: z.array(z.string()),
  url: z.string().nullish(),
  year: z.number().int(),
});

export async function upsertProject(input: z.infer<typeof ProjectInput>) {
  const user = await requireUser();
  const data = ProjectInput.parse(input);
  const payload = {
    userId: user.id,
    name: data.name,
    description: data.description as object,
    technologies: data.technologies,
    url: data.url ?? null,
    year: data.year,
  };
  let projectId: string;
  if (data.id) {
    await db.project.update({ where: { id: data.id }, data: payload });
    projectId = data.id;
  } else {
    const created = await db.project.create({ data: payload });
    projectId = created.id;
  }
  revalidatePath("/profile");
  await publishDomainEvent({
    type: "profile.localized.updated",
    userId: user.id,
    entityType: "project",
    entityId: projectId,
    fields: { description: data.description },
  });
}

export async function deleteProject(id: string) {
  const user = await requireUser();
  await db.project.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/profile");
}

// ---------------------------------------------------------------------------
// Consolidated read
// ---------------------------------------------------------------------------

export type ConsolidatedProfile = Awaited<
  ReturnType<typeof getConsolidatedProfile>
>;

export async function getConsolidatedProfile() {
  const user = await requireUser();
  const [identity, sections, experiences, skills, education, projects] =
    await Promise.all([
      db.profileIdentity.findUnique({ where: { userId: user.id } }),
      db.profileSection.findMany({
        where: { userId: user.id, isCurrent: true },
        orderBy: { sectionType: "asc" },
      }),
      db.experience.findMany({
        where: { userId: user.id },
        orderBy: [
          { endDate: { sort: "desc", nulls: "first" } },
          { startDate: "desc" },
        ],
      }),
      db.skill.findMany({
        where: { userId: user.id },
        orderBy: [{ category: "asc" }, { name: "asc" }],
      }),
      db.education.findMany({
        where: { userId: user.id },
        orderBy: { startDate: "desc" },
      }),
      db.project.findMany({
        where: { userId: user.id },
        orderBy: { year: "desc" },
      }),
    ]);
  return { identity, sections, experiences, skills, education, projects };
}
