import { Badge, Card, Group, Text } from "@mantine/core";
import { ChevronRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/server/auth-helpers";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

function atsColor(score: number) {
  if (score >= 75) return "var(--ch-success)";
  if (score >= 50) return "var(--ch-warning)";
  return "var(--ch-danger)";
}

export default async function GenerationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("nav");
  const user = await requireUser();
  const generations = await db.generation.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { template: true, campaign: true },
    take: 50,
  });

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <PageHeader title={t("generations")} />
      {generations.length === 0 ? (
        <Card>
          <EmptyState
            icon="file-text"
            title="—"
            hint="Pas encore de génération. Crée une campagne puis génère un CV."
          />
        </Card>
      ) : (
        <Card padding={0}>
          {generations.map((g) => {
            const ats = (g.atsScore as { global?: number } | null)?.global ?? null;
            return (
              <Link
                key={g.id}
                href={`/generations/${g.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "12px 18px",
                  borderBottom: "1px solid var(--ch-border-s)",
                  color: "var(--ch-fg-1)",
                  textDecoration: "none",
                }}
              >
                <Badge variant={g.type === "CV" ? "light" : "default"} color={g.type === "CV" ? "magenta" : "gray"} size="sm" style={{ fontWeight: 600, width: 52 }}>
                  {g.type}
                </Badge>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Group gap={6}>
                    <Text size="sm" fw={500} className="mono">
                      {g.template.name}
                    </Text>
                    <Badge variant="default" size="xs" className="mono">
                      {g.language.toUpperCase()}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {g.campaign?.name ?? "—"} · {g.llmProvider}/{g.llmModel}
                  </Text>
                </div>
                <div style={{ width: 80 }} className="mono">
                  {ats != null ? (
                    <span style={{ color: atsColor(ats), fontWeight: 600, fontSize: 12 }}>
                      {ats}
                      <span style={{ color: "var(--ch-fg-3)", fontWeight: 400 }}>/100</span>
                    </span>
                  ) : (
                    <span style={{ color: "var(--ch-fg-3)", fontSize: 12 }}>—</span>
                  )}
                </div>
                <Text size="xs" c="dimmed" className="mono" style={{ width: 96, textAlign: "right" }}>
                  {g.createdAt.toISOString().slice(0, 10)}
                </Text>
                <ChevronRight size={14} color="var(--ch-fg-3)" />
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}
