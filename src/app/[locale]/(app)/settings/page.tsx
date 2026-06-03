import { getTranslations, setRequestLocale } from "next-intl/server";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireUser } from "@/server/auth-helpers";
import { db } from "@/server/db";
import { type LlmConfig, parseLlmConfig } from "@/server/llm/client";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser();
  const t = await getTranslations("settings");

  const [tokens, prefs] = await Promise.all([
    db.apiToken.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    db.user.findUnique({
      where: { id: user.id },
      select: { density: true, colorScheme: true },
    }),
  ]);
  const config: LlmConfig = parseLlmConfig(user.llmConfig);

  // Narrow the persisted enum-ish strings to the union the client expects.
  const density = prefs?.density === "comfortable" ? "comfortable" : "dense";
  const colorScheme =
    prefs?.colorScheme === "light" || prefs?.colorScheme === "auto"
      ? prefs.colorScheme
      : "dark";

  return (
    <div style={{ padding: "28px 32px", maxWidth: 960, margin: "0 auto" }}>
      <PageHeader title={t("title")} />
      <SettingsTabs
        locale={locale === "en" ? "en" : "fr"}
        email={user.email}
        uiLocale={user.uiLocale}
        density={density}
        colorScheme={colorScheme}
        llmConfig={config}
        tokens={tokens.map((tok) => ({
          id: tok.id,
          name: tok.name,
          scopes: tok.scopes,
          lastUsedAt: tok.lastUsedAt
            ? tok.lastUsedAt.toISOString().slice(0, 10)
            : null,
          expiresAt: tok.expiresAt
            ? tok.expiresAt.toISOString().slice(0, 10)
            : null,
        }))}
      />
    </div>
  );
}
