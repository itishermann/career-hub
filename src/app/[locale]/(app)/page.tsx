import { Card } from "@mantine/core";
import {
  ArrowUpRight,
  Brain,
  ChevronRight,
  FileText,
  Pencil,
  Plus,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/server/auth-helpers";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = ["DRAFT", "SENT", "RESPONDED", "INTERVIEWING"] as const;

const STATUS_BADGE: Record<string, { label: string; bg: string; fg: string }> =
  {
    DRAFT: { label: "Brouillon", bg: "var(--ch-bg-2)", fg: "var(--ch-fg-2)" },
    SENT: { label: "Envoyée", bg: "var(--ch-info-bg)", fg: "var(--ch-info)" },
    RESPONDED: {
      label: "Réponse",
      bg: "var(--ch-info-bg)",
      fg: "var(--ch-info)",
    },
    INTERVIEWING: {
      label: "En entretien",
      bg: "var(--ch-accent-bg)",
      fg: "var(--ch-accent-2)",
    },
    REJECTED: {
      label: "Refus",
      bg: "var(--ch-danger-bg)",
      fg: "var(--ch-danger)",
    },
    ACCEPTED: {
      label: "Acceptée",
      bg: "var(--ch-success-bg)",
      fg: "var(--ch-success)",
    },
    WITHDRAWN: { label: "Retirée", bg: "var(--ch-bg-2)", fg: "var(--ch-fg-2)" },
  };

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tDash = await getTranslations("dashboard");
  const user = await requireUser();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    activeCampaigns,
    recentCampaigns,
    monthGenerations,
    recentGenerations,
    scoredGens,
    factsCount,
  ] = await Promise.all([
    db.campaign.count({
      where: { userId: user.id, status: { in: [...ACTIVE_STATUSES] } },
    }),
    db.campaign.findMany({
      where: { userId: user.id, status: { in: [...ACTIVE_STATUSES] } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { _count: { select: { generations: true } } },
    }),
    db.generation.count({
      where: { userId: user.id, createdAt: { gte: monthStart } },
    }),
    db.generation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { campaign: { select: { name: true } } },
    }),
    db.generation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { atsScore: true, campaignId: true },
    }),
    db.extractedFact.count({
      where: { applied: false, journalEntry: { userId: user.id } },
    }),
  ]);

  // Average ATS over scored generations.
  const scores = scoredGens
    .map((g) => (g.atsScore as { global?: number } | null)?.global)
    .filter((v): v is number => typeof v === "number");
  const avgAts =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

  // Recurring missing keywords across recent generations.
  const missingMap = new Map<string, Set<string>>();
  for (const g of scoredGens) {
    const miss =
      (g.atsScore as { missingKeywords?: { keyword: string }[] } | null)
        ?.missingKeywords ?? [];
    for (const m of miss) {
      if (!missingMap.has(m.keyword)) missingMap.set(m.keyword, new Set());
      if (g.campaignId) missingMap.get(m.keyword)!.add(g.campaignId);
    }
  }
  const recurring = [...missingMap.entries()]
    .map(([keyword, set]) => ({ keyword, campaigns: set.size }))
    .sort((a, b) => b.campaigns - a.campaigns)
    .slice(0, 4);

  const name = user.name?.split(" ")[0] ?? user.email.split("@")[0];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1280, margin: "0 auto" }}>
      {/* Greeting */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>
          {tDash("welcome", { name })}
        </h1>
        <div style={{ color: "var(--ch-fg-3)", fontSize: 13 }}>
          Tu as{" "}
          <strong style={{ color: "var(--ch-fg-1)" }}>
            {activeCampaigns} campagne{activeCampaigns > 1 ? "s" : ""} active
            {activeCampaigns > 1 ? "s" : ""}
          </strong>
          {factsCount > 0 ? (
            <>
              {" "}
              et{" "}
              <Link
                href="/journal"
                style={{ color: "var(--ch-accent-2)", fontWeight: 500 }}
              >
                {factsCount} fait{factsCount > 1 ? "s" : ""} à réconcilier
              </Link>{" "}
              depuis ton journal.
            </>
          ) : (
            "."
          )}
        </div>
      </div>

      {/* Stat tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 22,
        }}
      >
        <StatTile
          icon={<Target size={14} />}
          color="var(--ch-accent-2)"
          label={tDash("activeCampaigns")}
          value={activeCampaigns}
          hint="campagnes ouvertes"
        />
        <StatTile
          icon={<FileText size={14} />}
          color="var(--ch-info)"
          label="Générations ce mois"
          value={monthGenerations}
          hint="depuis le 1er"
        />
        <StatTile
          icon={<Brain size={14} />}
          color="var(--ch-warning)"
          label={tDash("toReconcile")}
          value={factsCount}
          hint="extraits journal"
        />
        <StatTile
          icon={<Sparkles size={14} />}
          color="var(--ch-success)"
          label="Score ATS moyen"
          value={avgAts ?? "—"}
          suffix={avgAts != null ? "/100" : undefined}
          hint="générations scorées"
        />
      </div>

      {/* Quick actions */}
      <Card padding="sm" mb="lg">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "var(--ch-fg-3)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Actions rapides
          </span>
          <span style={{ flex: 1 }} />
          <QuickLink
            href="/campaigns/new"
            icon={<Plus size={14} />}
            label="Nouvelle campagne"
          />
          <QuickLink
            href="/journal"
            icon={<Pencil size={14} />}
            label="Note journal"
          />
          <QuickLink
            href="/templates"
            icon={<FileText size={14} />}
            label="Templates"
          />
          <QuickLink
            href="/campaigns"
            icon={<Zap size={14} />}
            label="Générer un CV"
            primary
          />
        </div>
      </Card>

      {/* Widgets */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Widget
            title={tDash("activeCampaigns")}
            icon={<Target size={14} />}
            cta="Voir tout"
            ctaHref="/campaigns"
          >
            {recentCampaigns.length === 0 ? (
              <Empty>Pas de campagne active.</Empty>
            ) : (
              recentCampaigns.map((c, i) => (
                <Link
                  key={c.id}
                  href={`/campaigns/${c.id}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 0",
                    borderTop:
                      i === 0 ? "none" : "1px solid var(--ch-border-s)",
                    textDecoration: "none",
                    color: "var(--ch-fg-1)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.name}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--ch-fg-3)" }}>
                      {c.targetCompany ?? "—"} ·{" "}
                      <span className="mono">
                        {c.targetLanguage.toUpperCase()}
                      </span>{" "}
                      · {c._count.generations} génér.
                    </div>
                  </div>
                  <StatusChip status={c.status} />
                  <ChevronRight size={14} color="var(--ch-fg-3)" />
                </Link>
              ))
            )}
          </Widget>

          <Widget
            title={tDash("atsHints")}
            icon={<Sparkles size={14} />}
            hint="Mots-clés qui reviennent comme manquants sur plusieurs générations."
          >
            {recurring.length === 0 ? (
              <Empty>
                Rien à signaler — score tes générations pour voir les mots-clés
                manquants récurrents.
              </Empty>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {recurring.map((s) => (
                  <div
                    key={s.keyword}
                    style={{
                      padding: "10px 12px",
                      background: "var(--ch-bg-0)",
                      border: "1px solid var(--ch-border-s)",
                      borderRadius: 6,
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <span
                      className="mono"
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "var(--ch-accent-bg)",
                        color: "var(--ch-accent-2)",
                      }}
                    >
                      {s.keyword}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        fontSize: 12,
                        color: "var(--ch-fg-3)",
                        fontFamily: "var(--ch-font-mono)",
                      }}
                    >
                      manquant sur {s.campaigns} campagne
                      {s.campaigns > 1 ? "s" : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Widget>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Widget
            title={tDash("recentGenerations")}
            icon={<FileText size={14} />}
            cta="Voir tout"
            ctaHref="/generations"
          >
            {recentGenerations.length === 0 ? (
              <Empty>Pas encore de génération.</Empty>
            ) : (
              recentGenerations.map((g, i) => {
                const ats =
                  (g.atsScore as { global?: number } | null)?.global ?? null;
                return (
                  <Link
                    key={g.id}
                    href={`/generations/${g.id}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 0",
                      borderTop:
                        i === 0 ? "none" : "1px solid var(--ch-border-s)",
                      textDecoration: "none",
                      color: "var(--ch-fg-1)",
                    }}
                  >
                    <span
                      className="mono"
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        padding: "2px 7px",
                        borderRadius: 999,
                        background:
                          g.type === "CV"
                            ? "var(--ch-accent-bg)"
                            : "var(--ch-bg-2)",
                        color:
                          g.type === "CV"
                            ? "var(--ch-accent-2)"
                            : "var(--ch-fg-2)",
                      }}
                    >
                      {g.type}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div
                        className="mono"
                        style={{
                          fontSize: 12,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {" "}
                        {g.campaign?.name ?? "—"}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ch-fg-3)" }}>
                        {g.llmModel}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {ats != null ? (
                        <span
                          className="mono"
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color:
                              ats >= 75
                                ? "var(--ch-success)"
                                : ats >= 50
                                  ? "var(--ch-warning)"
                                  : "var(--ch-danger)",
                          }}
                        >
                          {ats}
                          <span
                            style={{ fontWeight: 400, color: "var(--ch-fg-3)" }}
                          >
                            /100
                          </span>
                        </span>
                      ) : (
                        <span
                          className="mono"
                          style={{ fontSize: 11, color: "var(--ch-fg-3)" }}
                        >
                          —
                        </span>
                      )}
                      <div
                        className="mono"
                        style={{
                          fontSize: 10.5,
                          color: "var(--ch-fg-3)",
                          marginTop: 2,
                        }}
                      >
                        {g.createdAt.toISOString().slice(0, 10)}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </Widget>

          <Widget
            title={tDash("toReconcile")}
            icon={<Brain size={14} />}
            badge={factsCount > 0 ? String(factsCount) : undefined}
            cta="Réconcilier"
            ctaHref="/journal"
          >
            <Empty>
              {factsCount > 0
                ? `${factsCount} faits extraits en attente.`
                : "Rien à réconcilier (l'extraction de faits arrive en slice 2)."}
            </Empty>
          </Widget>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  icon,
  color,
  label,
  value,
  suffix,
  hint,
}: {
  icon: ReactNode;
  color: string;
  label: string;
  value: ReactNode;
  suffix?: string;
  hint: string;
}) {
  return (
    <Card padding="md">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
          color: "var(--ch-fg-3)",
          fontSize: 11.5,
        }}
      >
        <span style={{ color, display: "inline-flex" }}>{icon}</span>
        <span
          style={{
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontWeight: 500,
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 4,
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontFamily: "var(--ch-font-head)",
            fontSize: 32,
            fontWeight: 600,
            color: "var(--ch-fg-1)",
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        {suffix && (
          <span
            style={{
              fontSize: 13,
              color: "var(--ch-fg-3)",
              fontFamily: "var(--ch-font-mono)",
            }}
          >
            {suffix}
          </span>
        )}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--ch-fg-3)" }}>{hint}</div>
    </Card>
  );
}

function QuickLink({
  href,
  icon,
  label,
  primary,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 500,
        textDecoration: "none",
        border: primary
          ? "1px solid var(--ch-accent)"
          : "1px solid var(--ch-border-m)",
        background: primary ? "var(--ch-accent)" : "var(--ch-bg-1)",
        color: primary ? "var(--ch-accent-fg)" : "var(--ch-fg-1)",
      }}
    >
      {icon}
      {label}
    </Link>
  );
}

function Widget({
  title,
  icon,
  hint,
  cta,
  ctaHref,
  badge,
  children,
}: {
  title: string;
  icon: ReactNode;
  hint?: string;
  cta?: string;
  ctaHref?: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <Card padding={0}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          borderBottom: "1px solid var(--ch-border-s)",
        }}
      >
        <span style={{ color: "var(--ch-fg-3)", display: "inline-flex" }}>
          {icon}
        </span>
        <h3 style={{ fontSize: 13, margin: 0 }}>{title}</h3>
        {badge && (
          <span
            style={{
              fontFamily: "var(--ch-font-mono)",
              fontSize: 10,
              color: "var(--ch-warning)",
              background: "var(--ch-warning-bg)",
              padding: "1px 6px",
              borderRadius: 999,
              fontWeight: 600,
            }}
          >
            {badge}
          </span>
        )}
        <span style={{ flex: 1 }} />
        {cta && ctaHref && (
          <Link
            href={ctaHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              color: "var(--ch-fg-2)",
              textDecoration: "none",
            }}
          >
            {cta} <ArrowUpRight size={12} />
          </Link>
        )}
      </div>
      {hint && (
        <div
          style={{
            padding: "8px 16px",
            fontSize: 11.5,
            color: "var(--ch-fg-3)",
            lineHeight: 1.5,
            borderBottom: "1px solid var(--ch-border-s)",
            background: "var(--ch-bg-0)",
          }}
        >
          {hint}
        </div>
      )}
      <div style={{ padding: "8px 16px 14px" }}>{children}</div>
    </Card>
  );
}

function StatusChip({ status }: { status: string }) {
  const s = STATUS_BADGE[status] ?? STATUS_BADGE.DRAFT;
  return (
    <span
      style={{
        whiteSpace: "nowrap",
        fontSize: 11,
        fontWeight: 500,
        padding: "2px 8px",
        borderRadius: 999,
        background: s.bg,
        color: s.fg,
      }}
    >
      {s.label}
    </span>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: "12px 0",
        fontSize: 12.5,
        color: "var(--ch-fg-3)",
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}
