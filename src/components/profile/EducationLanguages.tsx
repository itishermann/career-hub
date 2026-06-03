"use client";

import {
  ActionIcon,
  Button,
  Card,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { LocalizedTextInput } from "@/components/ui/LocalizedTextInput";
import {
  emptyLocalized,
  type Locale,
  type LocalizedText,
  pickLocalized,
} from "@/lib/i18n";
import {
  deleteEducation,
  deleteSkill,
  upsertEducation,
  upsertSkill,
} from "@/server/actions/profile";
import { translateField } from "@/server/actions/translator";

const LANG_CATEGORY = "languages-spoken";
const LEVELS = [
  "Langue maternelle",
  "C2",
  "C1",
  "B2",
  "B1",
  "A2",
  "A1",
] as const;

type EducationRow = {
  id: string;
  school: string;
  diploma: unknown;
  field?: unknown;
  location?: string | null;
  startDate: Date | string;
  endDate: Date | string | null;
};
type LanguageRow = { id: string; name: string; level: string | null };

function year(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? "—" : String(date.getFullYear());
}
function toDateInput(d: Date | string | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}
function levelPct(level: string | null): number {
  if (!level) return 55;
  const l = level.toLowerCase();
  if (l.includes("nati") || l.includes("mater") || l.includes("c2")) return 100;
  if (l.includes("c1")) return 85;
  if (l.includes("b2")) return 70;
  if (l.includes("b1")) return 55;
  if (l.includes("a")) return 35;
  return 60;
}

type EduForm = {
  id?: string;
  school: string;
  diploma: LocalizedText;
  field: LocalizedText;
  location: string;
  startDate: string;
  endDate: string;
};
const EMPTY_EDU: EduForm = {
  school: "",
  diploma: { fr: null, en: null },
  field: { fr: null, en: null },
  location: "",
  startDate: "",
  endDate: "",
};

/**
 * Education + Languages cards — fully editable (add / edit / delete) via modals.
 * Languages are skills under the "languages-spoken" category.
 */
export function EducationLanguages({
  education,
  languages,
  locale,
}: {
  education: EducationRow[];
  languages: LanguageRow[];
  locale: Locale;
}) {
  const t = useTranslations("profile");
  const tAct = useTranslations("actions");
  const [pending, startTransition] = useTransition();

  // Education modal
  const [eduOpen, eduCtl] = useDisclosure(false);
  const [edu, setEdu] = useState<EduForm>(EMPTY_EDU);

  function openEduNew() {
    setEdu(EMPTY_EDU);
    eduCtl.open();
  }
  function openEduEdit(e: EducationRow) {
    setEdu({
      id: e.id,
      school: e.school,
      diploma: (e.diploma as LocalizedText | null) ?? emptyLocalized(),
      field: (e.field as LocalizedText | null) ?? emptyLocalized(),
      location: e.location ?? "",
      startDate: toDateInput(e.startDate),
      endDate: toDateInput(e.endDate),
    });
    eduCtl.open();
  }
  function saveEdu() {
    if (!edu.school.trim() || !edu.startDate) {
      notifications.show({ color: "red", message: t("eduRequired") });
      return;
    }
    startTransition(async () => {
      try {
        await upsertEducation({
          id: edu.id,
          school: edu.school.trim(),
          diploma: edu.diploma,
          field: edu.field,
          location: edu.location || null,
          startDate: edu.startDate,
          endDate: edu.endDate || null,
        });
        notifications.show({ color: "green", message: tAct("saved") });
        eduCtl.close();
      } catch (e) {
        notifications.show({
          color: "red",
          message: e instanceof Error ? e.message : "Échec",
        });
      }
    });
  }
  function removeEdu(id: string) {
    startTransition(async () => {
      await deleteEducation(id);
      notifications.show({ color: "gray", message: tAct("deleted") });
    });
  }

  // Language modal
  const [langOpen, langCtl] = useDisclosure(false);
  const [lang, setLang] = useState<{
    id?: string;
    name: string;
    level: string;
  }>({ name: "", level: "C1" });

  function openLangNew() {
    setLang({ name: "", level: "C1" });
    langCtl.open();
  }
  function openLangEdit(l: LanguageRow) {
    setLang({ id: l.id, name: l.name, level: l.level ?? "C1" });
    langCtl.open();
  }
  function saveLang() {
    if (!lang.name.trim()) {
      notifications.show({ color: "red", message: t("langRequired") });
      return;
    }
    startTransition(async () => {
      try {
        await upsertSkill({
          id: lang.id,
          category: LANG_CATEGORY,
          name: lang.name.trim(),
          level: lang.level,
        });
        notifications.show({ color: "green", message: tAct("saved") });
        langCtl.close();
      } catch (e) {
        notifications.show({
          color: "red",
          message: e instanceof Error ? e.message : "Échec",
        });
      }
    });
  }
  function removeLang(id: string) {
    startTransition(async () => {
      await deleteSkill(id);
      notifications.show({ color: "gray", message: tAct("deleted") });
    });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {/* Education */}
      <Card>
        <Group justify="space-between" mb="sm">
          <Title order={3}>{t("education")}</Title>
          <Button
            size="compact-xs"
            variant="light"
            color="magenta"
            leftSection={<Plus size={12} />}
            onClick={openEduNew}
          >
            {tAct("add")}
          </Button>
        </Group>
        {education.length === 0 ? (
          <Text c="dimmed" size="sm">
            {t("noEducation")}
          </Text>
        ) : (
          <Stack gap={0}>
            {education.map((e) => {
              const diploma = pickLocalized(
                e.diploma as LocalizedText | null,
                locale,
              );
              return (
                <Group
                  key={e.id}
                  gap={10}
                  align="flex-start"
                  wrap="nowrap"
                  py={10}
                  style={{ borderTop: "1px solid var(--ch-border-s)" }}
                  className="row-hover"
                >
                  <GraduationCap
                    size={14}
                    color="var(--ch-fg-3)"
                    style={{ marginTop: 2, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {e.school}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ch-fg-2)" }}>
                      {diploma ?? "—"}
                    </div>
                  </div>
                  <span
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "var(--ch-fg-3)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {year(e.startDate)} – {year(e.endDate)}
                  </span>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    onClick={() => openEduEdit(e)}
                    aria-label={tAct("edit")}
                  >
                    <Pencil size={13} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="sm"
                    onClick={() => removeEdu(e.id)}
                    aria-label={tAct("delete")}
                  >
                    <Trash2 size={13} />
                  </ActionIcon>
                </Group>
              );
            })}
          </Stack>
        )}
      </Card>

      {/* Languages */}
      <Card>
        <Group justify="space-between" mb="sm">
          <Title order={3}>{t("languages")}</Title>
          <Button
            size="compact-xs"
            variant="light"
            color="magenta"
            leftSection={<Plus size={12} />}
            onClick={openLangNew}
          >
            {tAct("add")}
          </Button>
        </Group>
        {languages.length === 0 ? (
          <Text c="dimmed" size="sm">
            {t("noLanguages")}
          </Text>
        ) : (
          <Stack gap={0}>
            {languages.map((l) => (
              <div
                key={l.id}
                style={{
                  padding: "10px 0",
                  borderTop: "1px solid var(--ch-border-s)",
                }}
              >
                <Group justify="space-between" mb={5} wrap="nowrap">
                  <Text size="sm">{l.name}</Text>
                  <Group gap={4} wrap="nowrap">
                    <Text size="xs" c="dimmed">
                      {l.level ?? "—"}
                    </Text>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      onClick={() => openLangEdit(l)}
                      aria-label={tAct("edit")}
                    >
                      <Pencil size={12} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() => removeLang(l.id)}
                      aria-label={tAct("delete")}
                    >
                      <Trash2 size={12} />
                    </ActionIcon>
                  </Group>
                </Group>
                <div
                  style={{
                    height: 3,
                    background: "var(--ch-bg-0)",
                    borderRadius: 2,
                  }}
                >
                  <div
                    style={{
                      width: `${levelPct(l.level)}%`,
                      height: "100%",
                      borderRadius: 2,
                      background: "var(--ch-accent)",
                      opacity: 0.6,
                    }}
                  />
                </div>
              </div>
            ))}
          </Stack>
        )}
      </Card>

      {/* Education modal */}
      <Modal
        opened={eduOpen}
        onClose={eduCtl.close}
        title={edu.id ? t("editEducation") : t("addEducation")}
        size="lg"
        centered
      >
        <Stack gap="sm">
          <TextInput
            label={t("school")}
            value={edu.school}
            onChange={(e) =>
              setEdu((f) => ({ ...f, school: e.currentTarget.value }))
            }
            required
          />
          <LocalizedTextInput
            label={t("diploma")}
            values={edu.diploma}
            onChange={(v) => setEdu((f) => ({ ...f, diploma: v }))}
            defaultLocale={locale}
            onTranslate={(source, target, text) =>
              translateField({
                source,
                target,
                text,
                context: "education.diploma",
              })
            }
          />
          <LocalizedTextInput
            label={t("field")}
            values={edu.field}
            onChange={(v) => setEdu((f) => ({ ...f, field: v }))}
            defaultLocale={locale}
            onTranslate={(source, target, text) =>
              translateField({
                source,
                target,
                text,
                context: "education.field",
              })
            }
          />
          <TextInput
            label={t("location")}
            value={edu.location}
            onChange={(e) =>
              setEdu((f) => ({ ...f, location: e.currentTarget.value }))
            }
          />
          <Group grow>
            <TextInput
              type="date"
              label={t("startDate")}
              value={edu.startDate}
              onChange={(e) =>
                setEdu((f) => ({ ...f, startDate: e.currentTarget.value }))
              }
              required
            />
            <TextInput
              type="date"
              label={t("endDate")}
              value={edu.endDate}
              onChange={(e) =>
                setEdu((f) => ({ ...f, endDate: e.currentTarget.value }))
              }
            />
          </Group>
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={eduCtl.close}>
              {tAct("cancel")}
            </Button>
            <Button color="magenta" onClick={saveEdu} loading={pending}>
              {tAct("save")}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Language modal */}
      <Modal
        opened={langOpen}
        onClose={langCtl.close}
        title={lang.id ? t("editLanguage") : t("addLanguage")}
        centered
      >
        <Stack gap="sm">
          <TextInput
            label={t("languageName")}
            value={lang.name}
            onChange={(e) =>
              setLang((f) => ({ ...f, name: e.currentTarget.value }))
            }
            placeholder="Anglais"
            required
          />
          <Select
            label={t("level")}
            data={LEVELS as unknown as string[]}
            value={lang.level}
            onChange={(v) => v && setLang((f) => ({ ...f, level: v }))}
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={langCtl.close}>
              {tAct("cancel")}
            </Button>
            <Button color="magenta" onClick={saveLang} loading={pending}>
              {tAct("save")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
