"use client";

import {
  Badge,
  Button,
  Card,
  Drawer,
  Group,
  Stack,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { ArrowUpRight, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { LocalizedTextInput } from "@/components/ui/LocalizedTextInput";
import { type Locale, type LocalizedText, pickLocalized } from "@/lib/i18n";
import { upsertProfileSection } from "@/server/actions/profile";
import { translateField } from "@/server/actions/translator";

type SectionItem = {
  id: string;
  sectionType: string;
  contentMd: LocalizedText | null;
};

export function SectionsGrid({
  sections,
  locale,
}: {
  sections: SectionItem[];
  locale: Locale;
}) {
  const t = useTranslations("profile");
  const tAct = useTranslations("actions");
  const tSection = useTranslations("profile.sectionTypes");
  const tStatus = useTranslations("profile.sectionStatus");
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<{
    sectionType: string;
    value: LocalizedText;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const KNOWN_TYPES = [
    "soft_skills",
    "preferences",
    "anti_patterns",
    "voice",
    "interests",
    "differentiators",
    "anecdotes",
    "instructions",
  ] as const;

  const byType = new Map(sections.map((s) => [s.sectionType, s]));

  return (
    <Card>
      <Group justify="space-between" align="center" mb="sm">
        <Title order={3}>{t("sections")}</Title>
        <Badge variant="default" size="sm" className="mono">
          {KNOWN_TYPES.length}
        </Badge>
      </Group>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 8,
        }}
      >
        {KNOWN_TYPES.map((type) => {
          const section = byType.get(type);
          const content: LocalizedText = section?.contentMd ?? {
            fr: null,
            en: null,
          };
          const filledFr = !!content.fr && content.fr.trim().length > 0;
          const filledEn = !!content.en && content.en.trim().length > 0;
          const wordCount = (pickLocalized(content, locale) ?? "")
            .split(/\s+/)
            .filter(Boolean).length;
          return (
            <button
              key={type}
              type="button"
              onClick={() => {
                setEditing({ sectionType: type, value: content });
                open();
              }}
              style={{
                background: "var(--ch-bg-0)",
                border: "1px solid var(--ch-border-s)",
                borderRadius: 6,
                padding: 12,
                textAlign: "left",
                cursor: "pointer",
                transition: "background 120ms, border-color 120ms",
              }}
            >
              <Group justify="space-between" align="center" gap={6}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--ch-fg-1)",
                  }}
                >
                  {tSection(type)}
                </span>
                <ArrowUpRight size={12} color="var(--ch-fg-3)" />
              </Group>
              <Group gap={6} mt={8}>
                <Badge
                  variant="light"
                  color={filledFr ? "green" : "yellow"}
                  size="xs"
                >
                  {tStatus("fr")} ·{" "}
                  {filledFr ? tStatus("filled") : tStatus("empty")}
                </Badge>
                <Badge
                  variant="light"
                  color={filledEn ? "green" : "yellow"}
                  size="xs"
                >
                  {tStatus("en")} ·{" "}
                  {filledEn ? tStatus("filled") : tStatus("empty")}
                </Badge>
              </Group>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: "var(--ch-fg-3)",
                  fontFamily: "var(--ch-font-mono)",
                }}
              >
                {filledFr || filledEn
                  ? tStatus("wordsCount", { count: wordCount })
                  : tStatus("toComplete")}
              </div>
            </button>
          );
        })}
      </div>

      <Drawer
        opened={opened}
        onClose={() => {
          setEditing(null);
          close();
        }}
        position="right"
        size="lg"
        title={editing ? tSection(editing.sectionType) : ""}
      >
        {editing && (
          <Stack>
            <LocalizedTextInput
              values={editing.value}
              onChange={(next) => setEditing({ ...editing, value: next })}
              multiline
              rows={10}
              placeholder="Markdown supporté…"
              defaultLocale={locale}
              onTranslate={async (source, target, text) =>
                translateField({
                  source,
                  target,
                  text,
                  context: editing.sectionType,
                })
              }
            />
            <Group justify="flex-end" gap="xs">
              <Button variant="default" onClick={close}>
                {tAct("cancel")}
              </Button>
              <Button
                color="magenta"
                loading={pending}
                onClick={() => {
                  startTransition(async () => {
                    await upsertProfileSection({
                      sectionType: editing.sectionType as
                        | "pitch"
                        | "soft_skills"
                        | "preferences"
                        | "anti_patterns"
                        | "voice"
                        | "interests"
                        | "differentiators"
                        | "anecdotes"
                        | "instructions",
                      contentMd: editing.value,
                    });
                    close();
                  });
                }}
                leftSection={<Check size={14} />}
              >
                {tAct("save")}
              </Button>
            </Group>
          </Stack>
        )}
      </Drawer>
    </Card>
  );
}
