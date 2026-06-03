import { setRequestLocale } from "next-intl/server";
import { OnboardingWizard } from "@/components/wizard/OnboardingWizard";
import { type LlmConfig, parseLlmConfig } from "@/server/llm/client";
import { requireUser } from "@/server/auth-helpers";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser();
  const config: LlmConfig = parseLlmConfig(user.llmConfig);
  return (
    <OnboardingWizard initialLocale={user.uiLocale as "fr" | "en"} initialLlm={config} />
  );
}
