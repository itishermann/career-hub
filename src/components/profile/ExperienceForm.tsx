"use client";

import {
  Button,
  Drawer,
  Group,
  Select,
  Stack,
  TagsInput,
  Textarea,
  TextInput,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { Languages, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { LocalizedTextInput } from "@/components/ui/LocalizedTextInput";
import type { Locale, LocalizedStringArray, LocalizedText } from "@/lib/i18n";
import { deleteExperience, upsertExperience } from "@/server/actions/profile";
import { translateField } from "@/server/actions/translator";

export type ExperienceFormValue = {
  id?: string;
  company: string;
  role: string;
  status: string;
  location: string | null;
  startDate: Date | string;
  endDate: Date | string | null;
  description: unknown;
  achievements: unknown;
  technologies: string[];
};

const STATUS_VALUES = ["freelance", "salarie", "alternance", "stage"] as const;

function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function arrayToText(arr: string[] | null | undefined): string {
  return (arr ?? []).join("\n");
}
function textToArray(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function ExperienceForm({
  opened,
  onClose,
  initial,
  defaultLocale,
}: {
  opened: boolean;
  onClose: () => void;
  initial: ExperienceFormValue | null;
  defaultLocale: Locale;
}) {
  const t = useTranslations("experience");
  const tProfile = useTranslations("profile");
  const tAct = useTranslations("actions");
  const tStatus = useTranslations("experience.statusValues");
  const [pending, startTransition] = useTransition();

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<string>("freelance");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState<LocalizedText>({
    fr: null,
    en: null,
  });
  const [achFr, setAchFr] = useState("");
  const [achEn, setAchEn] = useState("");
  const [translatingAch, setTranslatingAch] = useState(false);
  const [technologies, setTechnologies] = useState<string[]>([]);

  // Sync form state whenever the target experience changes.
  useEffect(() => {
    if (!opened) return;
    const ach = (initial?.achievements as LocalizedStringArray | null) ?? {
      fr: null,
      en: null,
    };
    setCompany(initial?.company ?? "");
    setRole(initial?.role ?? "");
    setStatus(initial?.status ?? "freelance");
    setLocation(initial?.location ?? "");
    setStartDate(toDateInput(initial?.startDate));
    setEndDate(toDateInput(initial?.endDate ?? null));
    setDescription(
      (initial?.description as LocalizedText | null) ?? { fr: null, en: null },
    );
    setAchFr(arrayToText(ach.fr));
    setAchEn(arrayToText(ach.en));
    setTechnologies(initial?.technologies ?? []);
  }, [opened, initial]);

  const isEdit = !!initial?.id;
  const valid = company.trim() && role.trim() && startDate;

  function save() {
    if (!valid) return;
    startTransition(async () => {
      await upsertExperience({
        id: initial?.id,
        company: company.trim(),
        role: role.trim(),
        status: status as (typeof STATUS_VALUES)[number],
        location: location.trim() || null,
        startDate,
        endDate: endDate || null,
        description,
        achievements: { fr: textToArray(achFr), en: textToArray(achEn) },
        technologies,
      });
      notifications.show({
        color: "green",
        message: isEdit ? "Expérience mise à jour." : "Expérience ajoutée.",
      });
      onClose();
    });
  }

  // Translate the achievements list from whichever language is filled into the
  // empty one (line structure preserved by the model). Shown only when exactly
  // one side has content.
  const achFrFilled = achFr.trim().length > 0;
  const achEnFilled = achEn.trim().length > 0;
  const canTranslateAch = achFrFilled !== achEnFilled;
  async function translateAchievements() {
    if (!canTranslateAch) return;
    setTranslatingAch(true);
    try {
      if (achFrFilled) {
        setAchEn(
          await translateField({
            source: "fr",
            target: "en",
            text: achFr,
            context: "experience.achievements",
          }),
        );
      } else {
        setAchFr(
          await translateField({
            source: "en",
            target: "fr",
            text: achEn,
            context: "experience.achievements",
          }),
        );
      }
    } finally {
      setTranslatingAch(false);
    }
  }

  function confirmDelete() {
    const delId = initial?.id;
    if (!delId) return;
    modals.openConfirmModal({
      title: "Supprimer cette expérience ?",
      children: `${initial.company} — ${initial.role}. Cette action est irréversible.`,
      labels: { confirm: "Supprimer", cancel: "Annuler" },
      confirmProps: { color: "red" },
      onConfirm: () =>
        startTransition(async () => {
          await deleteExperience(delId);
          notifications.show({
            color: "green",
            message: "Expérience supprimée.",
          });
          onClose();
        }),
    });
  }

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="lg"
      title={isEdit ? "Éditer l'expérience" : tProfile("addExperience")}
    >
      <Stack gap="sm">
        <Group grow>
          <TextInput
            label={t("company")}
            required
            value={company}
            onChange={(e) => setCompany(e.currentTarget.value)}
          />
          <TextInput
            label={t("role")}
            required
            value={role}
            onChange={(e) => setRole(e.currentTarget.value)}
          />
        </Group>
        <Group grow>
          <Select
            label={t("status")}
            data={STATUS_VALUES.map((v) => ({ value: v, label: tStatus(v) }))}
            value={status}
            onChange={(v) => v && setStatus(v)}
          />
          <TextInput
            label={t("location")}
            value={location}
            onChange={(e) => setLocation(e.currentTarget.value)}
          />
        </Group>
        <Group grow>
          <TextInput
            type="date"
            label={t("startDate")}
            required
            value={startDate}
            onChange={(e) => setStartDate(e.currentTarget.value)}
          />
          <TextInput
            type="date"
            label={`${t("endDate")} (vide = actuel)`}
            value={endDate}
            onChange={(e) => setEndDate(e.currentTarget.value)}
          />
        </Group>

        <div>
          <span
            style={{ fontSize: 12, fontWeight: 500, color: "var(--ch-fg-2)" }}
          >
            {t("description")}
          </span>
          <LocalizedTextInput
            values={description}
            onChange={setDescription}
            multiline
            rows={3}
            defaultLocale={defaultLocale}
            onTranslate={(source, target, text) =>
              translateField({
                source,
                target,
                text,
                context: "experience.description",
              })
            }
          />
        </div>

        <div>
          <Group justify="space-between" align="center" mb={4}>
            <span
              style={{ fontSize: 12, fontWeight: 500, color: "var(--ch-fg-2)" }}
            >
              {t("achievements")}
            </span>
            {canTranslateAch && (
              <Button
                type="button"
                variant="subtle"
                size="compact-xs"
                color="magenta"
                leftSection={<Languages size={12} />}
                onClick={translateAchievements}
                loading={translatingAch}
              >
                {tAct("translateTo", {
                  target: achFrFilled ? "EN" : "FR",
                })}
              </Button>
            )}
          </Group>
          <Stack gap="xs">
            <Textarea
              label="FR (une par ligne)"
              value={achFr}
              onChange={(e) => setAchFr(e.currentTarget.value)}
              autosize
              minRows={3}
            />
            <Textarea
              label="EN (one per line)"
              value={achEn}
              onChange={(e) => setAchEn(e.currentTarget.value)}
              autosize
              minRows={2}
            />
          </Stack>
        </div>

        <TagsInput
          label={t("technologies")}
          value={technologies}
          onChange={setTechnologies}
          placeholder="Ajouter une techno + Entrée"
        />

        <Group justify="space-between" mt="md">
          {isEdit ? (
            <Button
              variant="subtle"
              color="red"
              leftSection={<Trash2 size={14} />}
              onClick={confirmDelete}
            >
              {tAct("delete")}
            </Button>
          ) : (
            <span />
          )}
          <Group gap="xs">
            <Button variant="default" onClick={onClose}>
              {tAct("cancel")}
            </Button>
            <Button
              color="magenta"
              onClick={save}
              loading={pending}
              disabled={!valid}
            >
              {tAct("save")}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Drawer>
  );
}
