import { Card, Group, Stack, Text, Title } from "@mantine/core";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AtsKeywordsCard } from "@/components/generations/AtsKeywordsCard";
import { GenerationActions } from "@/components/generations/GenerationActions";
import { GenerationDetailTabs } from "@/components/generations/GenerationDetailTabs";
import { ImproveButton } from "@/components/generations/ImproveButton";
import { ScoreButton } from "@/components/generations/ScoreButton";
import { SetBreadcrumbLabel } from "@/components/shell/BreadcrumbContext";
import { AtsScoreCard } from "@/components/ui/AtsScoreCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireUser } from "@/server/auth-helpers";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

// Default ATS target for the user-triggered improvement loop. Mirrors
// DEFAULT_TARGET in handlers/cv-improvement.ts.
const ATS_TARGET = 80;

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

type AtsScoreShape = {
  global: number;
  matchedKeywords?: {
    keyword: string;
    count?: number;
    category?: string;
    importance?: number;
  }[];
  missingKeywords?: {
    keyword: string;
    importance?: number;
    category?: string;
  }[];
};

export default async function GenerationDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await requireUser();
  const gen = await db.generation.findFirst({
    where: { id, userId: user.id },
    include: { template: true, campaign: true, profileSnapshot: true },
  });
  if (!gen) notFound();

  const ats = gen.atsScore as AtsScoreShape | null;
  const fileName = `${(gen.campaign?.name ?? gen.type).replace(/\s+/g, "_")}_${gen.type}.pdf`;

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1280, margin: "0 auto" }}>
      <SetBreadcrumbLabel label={`${gen.type} — ${gen.template.name}`} />
      <PageHeader
        title={`${gen.type} — ${gen.template.name}`}
        subtitle={`${gen.campaign?.name ?? "—"} · ${gen.language.toUpperCase()} · ${gen.llmProvider}/${gen.llmModel} · ${gen.durationMs}ms`}
        right={
          <GenerationActions
            generationId={gen.id}
            pdfAvailable={!!gen.outputPdfPath}
          />
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 320px",
          gap: 16,
        }}
      >
        <GenerationDetailTabs
          generationId={gen.id}
          hasPdf={!!gen.outputPdfPath}
          fileName={fileName}
          outputTypst={gen.outputTypst}
          llmPrompt={gen.llmPrompt}
          snapshotJson={JSON.stringify(gen.profileSnapshot.snapshot, null, 2)}
          compileError={gen.compileError}
        />

        <Stack gap="md">
          <Card>
            <Title order={3} mb="xs">
              Métriques
            </Title>
            <Stack gap={2}>
              <Stat label="Durée" value={`${gen.durationMs} ms`} />
              <Stat
                label="Provider"
                value={`${gen.llmProvider}/${gen.llmModel}`}
              />
              <Stat
                label="Input tokens"
                value={String(gen.inputTokens ?? "—")}
              />
              <Stat
                label="Output tokens"
                value={String(gen.outputTokens ?? "—")}
              />
              <Stat
                label="Coût"
                value={`${(gen.costCents ?? 0).toFixed(2)} ¢`}
              />
              <Stat
                label="PDF"
                value={gen.outputPdfPath ? "disponible" : "Typst seul"}
              />
            </Stack>
          </Card>

          {ats ? (
            <>
              <AtsScoreCard
                score={
                  ats as unknown as Parameters<typeof AtsScoreCard>[0]["score"]
                }
              />
              {gen.type === "CV" &&
                gen.campaign?.jobDescription &&
                ats.global < ATS_TARGET && (
                  <ImproveButton
                    generationId={gen.id}
                    targetScore={ATS_TARGET}
                  />
                )}
              <AtsKeywordsCard
                matched={ats.matchedKeywords ?? []}
                missing={ats.missingKeywords ?? []}
              />
            </>
          ) : (
            <Card>
              <Stack gap="xs">
                <Title order={3}>ATS</Title>
                <Text c="dimmed" size="sm">
                  Pas encore scoré.
                </Text>
                <ScoreButton generationId={gen.id} />
              </Stack>
            </Card>
          )}
        </Stack>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="md">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="sm" className="mono" style={{ textAlign: "right" }}>
        {value}
      </Text>
    </Group>
  );
}
