"use client";

import { ActionIcon, Button, Group, TextInput } from "@mantine/core";
import {
  ChevronRight,
  LayoutGrid,
  List,
  Plus,
  Search,
  User,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";

export type CampaignListItem = {
  id: string;
  name: string;
  company: string | null;
  role: string | null;
  status: string;
  lang: string;
  generations: number;
  bestAts: number | null;
  updatedAt: string;
  contact: string | null;
};

const STATUS_META: Record<string, { label: string; color: ColorKey }> = {
  DRAFT: { label: "Brouillon", color: "none" },
  SENT: { label: "Envoyée", color: "info" },
  RESPONDED: { label: "Réponse", color: "info" },
  INTERVIEWING: { label: "En entretien", color: "accent" },
  REJECTED: { label: "Refus", color: "danger" },
  ACCEPTED: { label: "Acceptée", color: "success" },
  WITHDRAWN: { label: "Retirée", color: "none" },
};
const STATUS_ORDER = [
  "DRAFT",
  "SENT",
  "RESPONDED",
  "INTERVIEWING",
  "REJECTED",
  "ACCEPTED",
  "WITHDRAWN",
];
const INACTIVE = new Set(["REJECTED", "WITHDRAWN", "ACCEPTED"]);

type ColorKey = "none" | "info" | "accent" | "danger" | "success" | "warning";
function colorFor(c: ColorKey) {
  switch (c) {
    case "accent":
      return {
        bg: "var(--ch-accent-bg)",
        fg: "var(--ch-accent-2)",
        solid: "var(--ch-accent)",
      };
    case "success":
      return {
        bg: "var(--ch-success-bg)",
        fg: "var(--ch-success)",
        solid: "var(--ch-success)",
      };
    case "danger":
      return {
        bg: "var(--ch-danger-bg)",
        fg: "var(--ch-danger)",
        solid: "var(--ch-danger)",
      };
    case "info":
      return {
        bg: "var(--ch-info-bg)",
        fg: "var(--ch-info)",
        solid: "var(--ch-info)",
      };
    case "warning":
      return {
        bg: "var(--ch-warning-bg)",
        fg: "var(--ch-warning)",
        solid: "var(--ch-warning)",
      };
    default:
      return {
        bg: "var(--ch-bg-1)",
        fg: "var(--ch-fg-2)",
        solid: "var(--ch-border-l)",
      };
  }
}

function relTime(iso: string): string {
  const d = new Date(iso).getTime();
  const days = Math.floor((Date.now() - d) / 86_400_000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} j`;
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem`;
  return `il y a ${Math.floor(days / 30)} mois`;
}

function atsColor(v: number) {
  return v >= 75
    ? "var(--ch-success)"
    : v >= 50
      ? "var(--ch-warning)"
      : "var(--ch-danger)";
}

export function CampaignsListView({
  campaigns,
}: {
  campaigns: CampaignListItem[];
}) {
  const [status, setStatus] = useState<string>("all");
  const [lang, setLang] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const activeCount = campaigns.filter((c) => !INACTIVE.has(c.status)).length;
  const sentCount = campaigns.filter((c) => c.status !== "DRAFT").length;
  const totalGens = campaigns.reduce((s, c) => s + c.generations, 0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (status === "active" && INACTIVE.has(c.status)) return false;
      if (status !== "all" && status !== "active" && c.status !== status)
        return false;
      if (lang !== "all" && c.lang !== lang) return false;
      if (q) {
        const hay =
          `${c.name} ${c.company ?? ""} ${c.role ?? ""} ${c.contact ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [campaigns, status, lang, search]);

  const hasFilters = status !== "all" || lang !== "all" || !!search;

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1280, margin: "0 auto" }}>
      <Group justify="space-between" align="flex-end" mb="md" wrap="wrap">
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Campagnes</h1>
          <div style={{ color: "var(--ch-fg-3)", fontSize: 12.5 }}>
            <strong style={{ color: "var(--ch-fg-1)" }}>
              {activeCount} active{activeCount > 1 ? "s" : ""}
            </strong>
            {" · "}
            {sentCount} envoyée{sentCount > 1 ? "s" : ""} · {totalGens}{" "}
            générations cumulées
          </div>
        </div>
        <Button
          component={Link}
          href="/campaigns/new"
          color="magenta"
          leftSection={<Plus size={14} />}
        >
          Nouvelle campagne
        </Button>
      </Group>

      {/* Status pills */}
      <Group gap={6} mb="sm" wrap="wrap">
        <Pill
          active={status === "all"}
          onClick={() => setStatus("all")}
          label="Toutes"
          count={campaigns.length}
        />
        <Pill
          active={status === "active"}
          onClick={() => setStatus("active")}
          label="Actives"
          count={activeCount}
          color="accent"
        />
        {STATUS_ORDER.map((s) => {
          const n = campaigns.filter((c) => c.status === s).length;
          if (n === 0) return null;
          return (
            <Pill
              key={s}
              active={status === s}
              onClick={() => setStatus(s)}
              label={STATUS_META[s].label}
              count={n}
              color={STATUS_META[s].color}
            />
          );
        })}
      </Group>

      {/* Search + filters + view toggle */}
      <Group gap="sm" mb="lg" wrap="wrap">
        <TextInput
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          placeholder="Nom, entreprise, poste, contact…"
          leftSection={<Search size={14} />}
          rightSection={
            search ? (
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => setSearch("")}
                aria-label="effacer"
              >
                <X size={12} />
              </ActionIcon>
            ) : null
          }
          style={{ flex: "1 1 240px", minWidth: 220 }}
        />
        <Seg
          value={lang}
          onChange={setLang}
          options={[
            { v: "all", l: "Toutes" },
            { v: "fr", l: "FR" },
            { v: "en", l: "EN" },
          ]}
        />
        <span style={{ flex: 1 }} />
        {hasFilters && (
          <Button
            variant="subtle"
            color="gray"
            size="sm"
            leftSection={<X size={12} />}
            onClick={() => {
              setStatus("all");
              setLang("all");
              setSearch("");
            }}
          >
            Réinitialiser
          </Button>
        )}
        <Seg
          value={view}
          onChange={(v) => setView(v as "grid" | "list")}
          options={[
            { v: "grid", l: "Cartes", icon: <LayoutGrid size={12} /> },
            { v: "list", l: "Liste", icon: <List size={12} /> },
          ]}
        />
      </Group>

      {campaigns.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: "var(--ch-fg-3)",
            border: "1px dashed var(--ch-border-m)",
            borderRadius: 8,
          }}
        >
          Aucune campagne. Crée ta première campagne pour démarrer.
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: 28,
            textAlign: "center",
            fontSize: 13,
            color: "var(--ch-fg-3)",
            border: "1px dashed var(--ch-border-m)",
            borderRadius: 6,
          }}
        >
          Aucune campagne ne correspond à ces filtres.
        </div>
      ) : view === "grid" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 14,
          }}
        >
          {filtered.map((c) => (
            <CampaignCard key={c.id} c={c} />
          ))}
        </div>
      ) : (
        <div
          style={{
            background: "var(--ch-bg-1)",
            border: "1px solid var(--ch-border-s)",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {filtered.map((c, i) => (
            <CampaignRow key={c.id} c={c} first={i === 0} />
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignCard({ c }: { c: CampaignListItem }) {
  const meta = STATUS_META[c.status] ?? STATUS_META.DRAFT;
  const sc = colorFor(meta.color);
  return (
    <Link
      href={`/campaigns/${c.id}`}
      style={{
        background: "var(--ch-bg-1)",
        border: "1px solid var(--ch-border-s)",
        borderRadius: 8,
        overflow: "hidden",
        textDecoration: "none",
        color: "var(--ch-fg-1)",
        display: "block",
      }}
    >
      <div style={{ height: 4, background: sc.solid }} />
      <div style={{ padding: "16px 18px 14px" }}>
        <Group justify="space-between" align="flex-start" mb="sm" wrap="nowrap">
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {c.company ?? c.name}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--ch-fg-3)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {c.role ?? c.name}
            </div>
          </div>
          <span
            className="mono"
            style={{
              fontSize: 10.5,
              padding: "2px 7px",
              borderRadius: 999,
              border: "1px solid var(--ch-border-s)",
              color: "var(--ch-fg-2)",
              flexShrink: 0,
            }}
          >
            {c.lang.toUpperCase()}
          </span>
        </Group>

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "2px 8px",
            background: sc.bg,
            color: sc.fg,
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 500,
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: 999,
              background: "currentColor",
            }}
          />
          {meta.label}
        </span>

        <div
          style={{
            display: "flex",
            gap: 12,
            padding: "12px 0 10px",
            marginTop: 12,
            borderTop: "1px solid var(--ch-border-s)",
          }}
        >
          <Stat
            label="Générations"
            value={c.generations > 0 ? String(c.generations) : "—"}
          />
          <Stat
            label="Meilleur ATS"
            value={c.bestAts != null ? `${c.bestAts}/100` : "—"}
            color={c.bestAts != null ? atsColor(c.bestAts) : undefined}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            paddingTop: 10,
            borderTop: "1px solid var(--ch-border-s)",
            color: "var(--ch-fg-3)",
            fontSize: 11,
          }}
        >
          {c.contact && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              <User size={11} />
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.contact}
              </span>
            </span>
          )}
          <span style={{ flex: 1 }} />
          <span className="mono">{relTime(c.updatedAt)}</span>
        </div>
      </div>
    </Link>
  );
}

function CampaignRow({ c, first }: { c: CampaignListItem; first: boolean }) {
  const meta = STATUS_META[c.status] ?? STATUS_META.DRAFT;
  const sc = colorFor(meta.color);
  return (
    <Link
      href={`/campaigns/${c.id}`}
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr 80px 90px 110px 24px",
        gap: 14,
        alignItems: "center",
        padding: "12px 18px",
        borderTop: first ? "none" : "1px solid var(--ch-border-s)",
        textDecoration: "none",
        color: "var(--ch-fg-1)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <Group gap={8} wrap="nowrap">
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {c.name}
          </span>
          <span
            className="mono"
            style={{ fontSize: 10, flexShrink: 0, color: "var(--ch-fg-3)" }}
          >
            {c.lang.toUpperCase()}
          </span>
        </Group>
        <div
          style={{
            fontSize: 11.5,
            color: "var(--ch-fg-3)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {c.company ?? "—"} · {c.role ?? "—"}
        </div>
      </div>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "2px 8px",
          background: sc.bg,
          color: sc.fg,
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 500,
          width: "fit-content",
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: 999,
            background: "currentColor",
          }}
        />
        {meta.label}
      </span>
      <span
        className="mono"
        style={{
          textAlign: "right",
          fontSize: 12.5,
          fontWeight: 600,
          color: c.bestAts != null ? atsColor(c.bestAts) : "var(--ch-fg-3)",
        }}
      >
        {c.bestAts != null ? c.bestAts : "—"}
      </span>
      <span
        className="mono"
        style={{ textAlign: "right", fontSize: 12, color: "var(--ch-fg-2)" }}
      >
        {c.generations}
      </span>
      <span
        className="mono"
        style={{ textAlign: "right", fontSize: 11, color: "var(--ch-fg-3)" }}
      >
        {relTime(c.updatedAt)}
      </span>
      <ChevronRight size={14} color="var(--ch-fg-3)" />
    </Link>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div style={{ flex: 1 }}>
      <div
        style={{
          color: "var(--ch-fg-3)",
          fontSize: 10.5,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        className="mono"
        style={{
          color: color ?? "var(--ch-fg-1)",
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  label,
  count,
  color = "none",
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color?: ColorKey;
}) {
  const c = colorFor(color);
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 12px",
        background: active ? c.bg : "var(--ch-bg-1)",
        border: active
          ? `1px solid ${c.solid}`
          : "1px solid var(--ch-border-m)",
        borderRadius: 999,
        color: active ? c.fg : "var(--ch-fg-2)",
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
      <span
        className="mono"
        style={{
          fontSize: 10.5,
          padding: "1px 6px",
          background: "rgba(127,127,127,0.18)",
          borderRadius: 999,
          fontWeight: 600,
        }}
      >
        {count}
      </span>
    </button>
  );
}

function Seg<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { v: T; l: string; icon?: React.ReactNode }[];
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        background: "var(--ch-bg-1)",
        border: "1px solid var(--ch-border-m)",
        borderRadius: 6,
        padding: 2,
      }}
    >
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 10px",
            background: value === o.v ? "var(--ch-bg-2)" : "transparent",
            border: "none",
            color: value === o.v ? "var(--ch-fg-1)" : "var(--ch-fg-3)",
            fontSize: 11.5,
            fontWeight: 500,
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          {o.icon}
          {o.l}
        </button>
      ))}
    </div>
  );
}
