"use client";

import { Badge, Group } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { ArrowUpRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";

export type TemplateItem = {
  name: string;
  type: "CV" | "COVER_LETTER";
  supportedLanguages: string[];
  description: string | null;
  atsCompliant: boolean;
  isDefault: boolean;
  version: number;
  usedBy: number;
};

export function TemplatesGallery({ templates }: { templates: TemplateItem[] }) {
  const [type, setType] = useState<"all" | "CV" | "COVER_LETTER">("all");
  const [lang, setLang] = useState<"all" | "fr" | "en">("all");

  const items = useMemo(
    () =>
      templates.filter((t) => {
        if (type !== "all" && t.type !== type) return false;
        if (lang !== "all" && !t.supportedLanguages.includes(lang))
          return false;
        return true;
      }),
    [templates, type, lang],
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1280, margin: "0 auto" }}>
      <Group justify="space-between" align="flex-end" mb="lg" wrap="wrap">
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Templates</h1>
          <div style={{ color: "var(--ch-fg-3)", fontSize: 12.5 }}>
            Code Typst versionné. Modifiable par toi ou par le LLM.
          </div>
        </div>
      </Group>

      <Group gap="sm" mb="lg" align="center">
        <Seg
          value={type}
          onChange={(v) => setType(v as typeof type)}
          options={[
            { v: "all", l: "Tous" },
            { v: "CV", l: "CV" },
            { v: "COVER_LETTER", l: "Lettre" },
          ]}
        />
        <Seg
          value={lang}
          onChange={(v) => setLang(v as typeof lang)}
          options={[
            { v: "all", l: "Toutes langues" },
            { v: "fr", l: "FR" },
            { v: "en", l: "EN" },
          ]}
        />
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: "var(--ch-fg-3)" }}>
          {items.length} {items.length > 1 ? "templates" : "template"}
        </span>
      </Group>

      {items.length === 0 ? (
        <div
          style={{
            padding: 18,
            textAlign: "center",
            fontSize: 13,
            color: "var(--ch-fg-3)",
            border: "1px dashed var(--ch-border-m)",
            borderRadius: 6,
          }}
        >
          Aucun template ne correspond à ces filtres.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 14,
          }}
        >
          {items.map((t) => (
            <TemplateCard key={t.name} t={t} />
          ))}
          <button
            type="button"
            onClick={() =>
              notifications.show({
                color: "gray",
                message: "L'éditeur Typst inline arrive en Phase 8.",
              })
            }
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              minHeight: 280,
              background: "var(--ch-bg-0)",
              border: "1px dashed var(--ch-border-m)",
              borderRadius: 8,
              cursor: "pointer",
              color: "var(--ch-fg-2)",
            }}
          >
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                background: "var(--ch-bg-1)",
                border: "1px solid var(--ch-border-m)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Plus size={18} />
            </span>
            <div style={{ fontSize: 13, fontWeight: 500, marginTop: 10 }}>
              Créer un nouveau template
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: "var(--ch-fg-3)",
                textAlign: "center",
                maxWidth: 180,
              }}
            >
              Partir d'un blanc, ou cloner un existant.
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

function TemplateCard({ t }: { t: TemplateItem }) {
  return (
    <Link
      href={`/templates/${t.name}`}
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
      <div
        style={{
          position: "relative",
          background: "var(--ch-bg-0)",
          padding: 18,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 150,
            aspectRatio: "1 / 1.414",
            background: "var(--ch-bg-1)",
            border: "1px solid var(--ch-border-m)",
            borderRadius: 3,
            boxShadow: "var(--ch-shadow-sm)",
            overflow: "hidden",
          }}
        >
          <PreviewMock type={t.type} />
        </div>
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 12,
            display: "flex",
            gap: 4,
          }}
        >
          {t.atsCompliant && (
            <Badge size="xs" variant="light" color="green">
              ATS
            </Badge>
          )}
          {t.isDefault && (
            <Badge size="xs" variant="light" color="magenta">
              défaut
            </Badge>
          )}
        </div>
      </div>

      <div style={{ padding: "14px 16px 16px" }}>
        <Group gap={8} mb={6} wrap="nowrap">
          <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>
            {t.name}
          </span>
          <span style={{ flex: 1 }} />
          <Badge size="xs" variant="default" className="mono">
            {t.type === "CV" ? "CV" : "LM"}
          </Badge>
        </Group>
        <div
          style={{
            fontSize: 12,
            color: "var(--ch-fg-2)",
            lineHeight: 1.5,
            height: 36,
            overflow: "hidden",
            marginBottom: 12,
          }}
        >
          {t.description ?? "—"}
        </div>
        <Group
          gap={8}
          style={{
            fontSize: 11,
            color: "var(--ch-fg-3)",
            fontFamily: "var(--ch-font-mono)",
          }}
          wrap="nowrap"
        >
          <span>v{t.version}</span>
          <span>·</span>
          <span>{t.usedBy} génér.</span>
          <span>·</span>
          <span>
            {t.supportedLanguages.map((l) => l.toUpperCase()).join(" / ")}
          </span>
          <span style={{ flex: 1 }} />
          <ArrowUpRight size={12} />
        </Group>
      </div>
    </Link>
  );
}

function PreviewMock({ type }: { type: "CV" | "COVER_LETTER" }) {
  const bar = (w: string, opacity = 0.45, accent = false) => (
    <div
      style={{
        height: accent ? 6 : 3,
        width: w,
        background: accent ? "var(--ch-accent)" : "var(--ch-fg-3)",
        opacity: accent ? 0.7 : opacity,
        borderRadius: 1,
      }}
    />
  );
  if (type === "CV") {
    return (
      <div
        style={{
          padding: "12px 10px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div
          style={{
            height: 9,
            width: "55%",
            background: "var(--ch-fg-2)",
            opacity: 0.85,
            borderRadius: 1,
          }}
        />
        <Group gap={4}>{["40%", "24%", "30%"].map((w) => bar(w, 0.6))}</Group>
        <div style={{ height: 1, background: "var(--ch-border-m)" }} />
        {bar("44px", 0.7, true)}
        {["88%", "74%", "82%"].map((w) => bar(w))}
        {bar("52px", 0.7, true)}
        {["86%", "70%", "90%"].map((w) => bar(w))}
        {bar("40px", 0.7, true)}
        <Group gap={3} wrap="wrap">
          {[10, 14, 12, 11, 14].map((w, i) => (
            <div
              key={i}
              style={{
                height: 5,
                width: w,
                background: "var(--ch-fg-3)",
                opacity: 0.4,
                borderRadius: 2,
              }}
            />
          ))}
        </Group>
      </div>
    );
  }
  return (
    <div
      style={{
        padding: "12px 10px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 5,
      }}
    >
      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          alignItems: "flex-end",
        }}
      >
        {["36px", "28px", "44px"].map((w) => bar(w, 0.55))}
      </div>
      {bar("35%", 0.7)}
      {["94%", "88%", "92%", "84%", "70%"].map((w) => bar(w))}
      <div style={{ height: 3 }} />
      {["80%", "60%"].map((w) => bar(w))}
    </div>
  );
}

function Seg<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { v: T; l: string }[];
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
          {o.l}
        </button>
      ))}
    </div>
  );
}
