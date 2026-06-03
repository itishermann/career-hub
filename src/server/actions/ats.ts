"use server";

import { revalidatePath } from "next/cache";
import { getOrExtractCampaignKeywords } from "@/server/ats/keywords";
import { requireUser } from "@/server/auth-helpers";
import { db } from "@/server/db";
import type { AtsKeywords } from "@/server/llm/prompts/ats-keyword-extractor";

/**
 * Extract (or read from cache) the ATS keywords for a campaign's job
 * description. Cached in CampaignAtsKeywords and invalidated when the JD hash
 * changes. Used by the campaign JD card.
 */
export async function extractCampaignKeywords(
  campaignId: string,
): Promise<{ keywords: AtsKeywords; cached: boolean }> {
  const user = await requireUser();
  const campaign = await db.campaign.findFirst({
    where: { id: campaignId, userId: user.id },
  });
  if (!campaign) throw new Error("Campaign not found");
  if (!campaign.jobDescription || campaign.jobDescription.trim().length === 0) {
    throw new Error(
      "Cette campagne n'a pas de description de poste à analyser.",
    );
  }
  const result = await getOrExtractCampaignKeywords(
    campaign.id,
    campaign.jobDescription,
    campaign.targetLanguage as "fr" | "en",
    user.llmConfig,
  );
  revalidatePath(`/campaigns/${campaignId}`);
  return result;
}
