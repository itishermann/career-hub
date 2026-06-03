import { setRequestLocale } from "next-intl/server";
import {
  type CampaignListItem,
  CampaignsListView,
} from "@/components/campaigns/CampaignsListView";
import { requireUser } from "@/server/auth-helpers";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function CampaignsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser();

  const campaigns = await db.campaign.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      generations: { select: { atsScore: true } },
    },
  });

  const items: CampaignListItem[] = campaigns.map((c) => {
    const scores = c.generations
      .map((g) => (g.atsScore as { global?: number } | null)?.global)
      .filter((v): v is number => typeof v === "number");
    return {
      id: c.id,
      name: c.name,
      company: c.targetCompany,
      role: c.targetRole,
      status: c.status,
      lang: c.targetLanguage,
      generations: c.generations.length,
      bestAts: scores.length > 0 ? Math.max(...scores) : null,
      updatedAt: c.updatedAt.toISOString(),
      contact: c.contactName,
    };
  });

  return <CampaignsListView campaigns={items} />;
}
