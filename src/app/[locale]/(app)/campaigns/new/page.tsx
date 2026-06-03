import { setRequestLocale } from "next-intl/server";
import { NewCampaignWizard } from "@/components/campaigns/NewCampaignWizard";
import { requireUser } from "@/server/auth-helpers";

export const dynamic = "force-dynamic";

export default async function NewCampaignPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser();
  return <NewCampaignWizard initialLocale={user.uiLocale as "fr" | "en"} />;
}
