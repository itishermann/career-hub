"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { LocaleSchema } from "@/lib/i18n";
import { requireUser } from "@/server/auth-helpers";
import { db } from "@/server/db";

const CreateCampaignInput = z.object({
  name: z.string().min(1),
  targetCompany: z.string().optional().nullable(),
  targetRole: z.string().optional().nullable(),
  targetLanguage: LocaleSchema.default("fr"),
  jobDescription: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable().or(z.literal("")),
  notes: z.string().optional().nullable(),
});

export async function createCampaign(raw: z.infer<typeof CreateCampaignInput>): Promise<string> {
  const user = await requireUser();
  const data = CreateCampaignInput.parse(raw);
  const c = await db.campaign.create({
    data: {
      userId: user.id,
      name: data.name,
      targetCompany: data.targetCompany || null,
      targetRole: data.targetRole || null,
      targetLanguage: data.targetLanguage,
      jobDescription: data.jobDescription || null,
      contactName: data.contactName || null,
      contactEmail: data.contactEmail || null,
      notes: data.notes || null,
    },
  });
  revalidatePath("/campaigns");
  return c.id;
}

const UpdateCampaignInput = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  targetCompany: z.string().nullish(),
  targetRole: z.string().nullish(),
  targetLanguage: LocaleSchema.optional(),
  jobDescription: z.string().nullish(),
  contactName: z.string().nullish(),
  contactEmail: z.string().nullish(),
  notes: z.string().nullish(),
  status: z
    .enum(["DRAFT", "SENT", "RESPONDED", "INTERVIEWING", "REJECTED", "ACCEPTED", "WITHDRAWN"])
    .optional(),
});

export async function updateCampaign(raw: z.infer<typeof UpdateCampaignInput>) {
  const user = await requireUser();
  const data = UpdateCampaignInput.parse(raw);
  const { id, ...rest } = data;
  await db.campaign.updateMany({
    where: { id, userId: user.id },
    data: rest,
  });
  revalidatePath(`/campaigns/${id}`);
  revalidatePath("/campaigns");
}

export async function deleteCampaign(id: string) {
  const user = await requireUser();
  await db.campaign.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/campaigns");
}
