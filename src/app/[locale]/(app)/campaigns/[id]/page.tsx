import { Badge, Card, Group, Stack, Text, Title } from "@mantine/core";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CampaignGenerate } from "@/components/campaigns/CampaignGenerate";
import { CampaignStatusControl } from "@/components/campaigns/CampaignStatusControl";
import type { TemplateChoice } from "@/components/campaigns/GenerateModal";
import { JobDescriptionCard } from "@/components/campaigns/JobDescriptionCard";
import { SetBreadcrumbLabel } from "@/components/shell/BreadcrumbContext";
import { Link } from "@/i18n/navigation";
import { type Locale, type LocalizedText, pickLocalized } from "@/lib/i18n";
import { requireUser } from "@/server/auth-helpers";
import { db } from "@/server/db";
import { getLlmModeForUser } from "@/server/llm/client";
import type { AtsKeywords } from "@/server/llm/prompts/ats-keyword-extractor";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function CampaignDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await requireUser();
  const campaign = await db.campaign.findFirst({
    where: { id, userId: user.id },
    include: {
      generations: {
        orderBy: { createdAt: "desc" },
        include: { template: true },
      },
      atsKeywords: true,
    },
  });
  if (!campaign) notFound();
  const t = await getTranslations("campaign");
  const lang = campaign.targetLanguage as Locale;

  const allTemplates = await db.template.findMany({});
  const toChoice = (tpl: (typeof allTemplates)[number]): TemplateChoice => ({
    name: tpl.name,
    description: pickLocalized(tpl.description as LocalizedText | null, lang),
    atsCompliant: !!(tpl.meta as { ats_compliant?: boolean } | null)
      ?.ats_compliant,
  });
  const cvTemplates = allTemplates
    .filter((tpl) => tpl.type === "CV" && tpl.supportedLanguages.includes(lang))
    .map(toChoice);
  const lmTemplates = allTemplates
    .filter(
      (tpl) =>
        tpl.type === "COVER_LETTER" && tpl.supportedLanguages.includes(lang),
    )
    .map(toChoice);

  const mode = getLlmModeForUser(user.llmConfig);
  const initialKeywords =
    (campaign.atsKeywords?.keywords as AtsKeywords | null) ?? null;
  const cachedHint = campaign.atsKeywords
    ? `jdHash ${campaign.atsKeywords.jdHash.slice(0, 6)}…`
    : undefined;

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <SetBreadcrumbLabel label={campaign.name} />
      {/* Header — title + inline editable status, meta below, generate right */}
      <Group
        justify="space-between"
        align="flex-start"
        wrap="wrap"
        mb="lg"
        gap="md"
      >
        <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="sm" align="center">
            <Title order={1} style={{ fontSize: 22 }}>
              {campaign.name}
            </Title>
            <CampaignStatusControl
              campaignId={campaign.id}
              initial={campaign.status}
            />
          </Group>
          <Group gap="xs" c="dimmed" style={{ fontSize: 13 }} wrap="wrap">
            <Text size="sm" fw={500}>
              {campaign.targetCompany ?? "—"}
            </Text>
            <span>·</span>
            <Text size="sm">{campaign.targetRole ?? "—"}</Text>
            <span>·</span>
            <Text size="sm" className="mono">
              {lang.toUpperCase()}
            </Text>
            <Text size="sm" c="dimmed">
              (génération)
            </Text>
          </Group>
        </Stack>
        <CampaignGenerate
          campaignId={campaign.id}
          language={lang}
          cvTemplates={cvTemplates}
          lmTemplates={lmTemplates}
          subtitle={`Pipeline reproductible · mode ${mode}`}
        />
      </Group>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 320px",
          gap: 16,
        }}
      >
        <Stack gap="md">
          <JobDescriptionCard
            campaignId={campaign.id}
            jobDescription={campaign.jobDescription}
            initialKeywords={initialKeywords}
            cachedHint={cachedHint}
          />

          <Card padding={0}>
            <Group
              justify="space-between"
              align="center"
              px="lg"
              py="md"
              style={{ borderBottom: "1px solid var(--ch-border-s)" }}
            >
              <Title order={3}>{t("generations")}</Title>
              <Badge variant="default" size="sm" className="mono">
                {campaign.generations.length}
              </Badge>
            </Group>
            {campaign.generations.length === 0 ? (
              <Text c="dimmed" size="sm" p="lg">
                Pas encore de génération — clique « Générer un CV » en haut à
                droite.
              </Text>
            ) : (
              <Stack gap={0}>
                {campaign.generations.map((g) => {
                  const ats =
                    (g.atsScore as { global?: number } | null)?.global ?? null;
                  return (
                    <Link
                      key={g.id}
                      href={`/generations/${g.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 20px",
                        borderTop: "1px solid var(--ch-border-s)",
                        color: "var(--ch-fg-1)",
                        textDecoration: "none",
                      }}
                    >
                      <Badge
                        size="xs"
                        variant={g.type === "CV" ? "light" : "default"}
                        color={g.type === "CV" ? "magenta" : "gray"}
                        style={{ width: 48 }}
                      >
                        {g.type}
                      </Badge>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" fw={500} className="mono">
                          {g.template.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {g.llmProvider}/{g.llmModel} · {g.durationMs}ms
                        </Text>
                      </div>
                      {ats != null && (
                        <Text size="xs" className="mono" fw={600}>
                          {ats}/100
                        </Text>
                      )}
                      <Text size="xs" c="dimmed" className="mono">
                        {g.createdAt.toISOString().slice(0, 10)}
                      </Text>
                    </Link>
                  );
                })}
              </Stack>
            )}
          </Card>
        </Stack>

        <Stack gap="md">
          <Card>
            <Title order={3} mb="xs">
              Cible
            </Title>
            <Stack gap={4}>
              <Kv label="Entreprise" value={campaign.targetCompany ?? "—"} />
              <Kv label="Poste" value={campaign.targetRole ?? "—"} />
              <Kv label="Langue génération" value={lang.toUpperCase()} />
            </Stack>
          </Card>

          <Card>
            <Title order={3} mb="xs">
              Contact
            </Title>
            <Stack gap={4}>
              <Kv label="Nom" value={campaign.contactName ?? "—"} />
              <Kv label="Email" value={campaign.contactEmail ?? "—"} mono />
            </Stack>
          </Card>

          <Card>
            <Title order={3} mb="xs">
              Notes
            </Title>
            <Text
              size="sm"
              c={campaign.notes ? undefined : "dimmed"}
              style={{ whiteSpace: "pre-wrap" }}
            >
              {campaign.notes ?? "—"}
            </Text>
          </Card>
        </Stack>
      </div>
    </div>
  );
}

function Kv({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="md">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text
        size="sm"
        className={mono ? "mono" : undefined}
        style={{ textAlign: "right", minWidth: 0 }}
      >
        {value}
      </Text>
    </Group>
  );
}
