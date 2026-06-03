"use client";

import {
  Badge,
  Button,
  Card,
  Collapse,
  Group,
  Stack,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { ChevronRight, Pencil, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import {
  ExperienceForm,
  type ExperienceFormValue,
} from "@/components/profile/ExperienceForm";
import { type Locale, pickLocalized, pickLocalizedArray } from "@/lib/i18n";

type Experience = ExperienceFormValue & { id: string };

export function ExperiencesList({
  experiences,
}: {
  experiences: Experience[];
}) {
  const t = useTranslations("profile");
  const tStatus = useTranslations("experience.statusValues");
  const locale = useLocale() as Locale;
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Experience | null>(null);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(e: Experience) {
    setEditing(e);
    setFormOpen(true);
  }

  return (
    <Card padding={0}>
      <Group
        justify="space-between"
        align="center"
        px="lg"
        py="md"
        style={{ borderBottom: "1px solid var(--ch-border-s)" }}
      >
        <Title order={3}>{t("experiences")}</Title>
        <Group gap="xs">
          <Badge variant="default" size="sm" className="mono">
            {experiences.length}
          </Badge>
          <Button
            size="compact-xs"
            variant="subtle"
            color="magenta"
            leftSection={<Plus size={13} />}
            onClick={openAdd}
          >
            {t("addExperience")}
          </Button>
        </Group>
      </Group>
      {experiences.length === 0 ? (
        <Stack align="center" gap="xs" py="xl">
          <span style={{ color: "var(--ch-fg-3)", fontSize: 13 }}>
            {t("noExperiences")}
          </span>
          <Button
            size="xs"
            variant="default"
            leftSection={<Plus size={13} />}
            onClick={openAdd}
          >
            {t("addExperience")}
          </Button>
        </Stack>
      ) : (
        <Stack gap={0}>
          {experiences.map((e) => (
            <ExperienceItem
              key={e.id}
              experience={e}
              locale={locale}
              tStatus={tStatus}
              onEdit={() => openEdit(e)}
            />
          ))}
        </Stack>
      )}

      <ExperienceForm
        opened={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing}
        defaultLocale={locale}
      />
    </Card>
  );
}

function ExperienceItem({
  experience: e,
  locale,
  tStatus,
  onEdit,
}: {
  experience: Experience;
  locale: Locale;
  tStatus: (key: "freelance" | "salarie" | "alternance" | "stage") => string;
  onEdit: () => void;
}) {
  const [opened, { toggle }] = useDisclosure(false);
  const start =
    typeof e.startDate === "string" ? new Date(e.startDate) : e.startDate;
  const end = e.endDate
    ? typeof e.endDate === "string"
      ? new Date(e.endDate)
      : e.endDate
    : null;
  const yearsSpan = `${start.getFullYear()} – ${end ? end.getFullYear() : "présent"}`;
  const desc = pickLocalized(
    e.description as { fr?: string | null; en?: string | null } | null,
    locale,
  );
  const achievements = pickLocalizedArray(
    e.achievements as { fr?: string[] | null; en?: string[] | null } | null,
    locale,
  );
  const isCurrent = !end;

  return (
    <div style={{ borderTop: "1px solid var(--ch-border-s)" }}>
      <UnstyledButton
        onClick={toggle}
        style={{
          display: "flex",
          gap: 14,
          padding: "16px 20px",
          background: "transparent",
          textAlign: "left",
          alignItems: "flex-start",
          width: "100%",
        }}
      >
        <span
          style={{
            width: 6,
            marginTop: 7,
            height: 6,
            borderRadius: 999,
            background: isCurrent ? "var(--ch-success)" : "var(--ch-fg-3)",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" align="baseline" wrap="wrap">
            <span
              style={{ fontWeight: 600, fontSize: 14, color: "var(--ch-fg-1)" }}
            >
              {e.company}
            </span>
            <Badge size="xs" variant="default">
              {tStatus(
                e.status as "freelance" | "salarie" | "alternance" | "stage",
              )}
            </Badge>
            {isCurrent && (
              <Badge size="xs" variant="light" color="green">
                actuel
              </Badge>
            )}
          </Group>
          <div style={{ fontSize: 13, color: "var(--ch-fg-2)", marginTop: 2 }}>
            {e.role}
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              color: "var(--ch-fg-3)",
              fontSize: 11.5,
              marginTop: 4,
              fontFamily: "var(--ch-font-mono)",
            }}
          >
            <span>{yearsSpan}</span>
            {e.location && (
              <>
                <span>·</span>
                <span>{e.location}</span>
              </>
            )}
          </div>
        </div>
        <ChevronRight
          size={14}
          style={{
            color: "var(--ch-fg-3)",
            transition: "transform 150ms",
            transform: opened ? "rotate(90deg)" : "rotate(0deg)",
            marginTop: 4,
          }}
        />
      </UnstyledButton>

      <Collapse expanded={opened}>
        <div style={{ padding: "0 20px 16px 40px" }}>
          {desc && (
            <p
              style={{
                marginTop: 0,
                fontSize: 12.5,
                color: "var(--ch-fg-2)",
                lineHeight: 1.55,
              }}
            >
              {desc}
            </p>
          )}
          {achievements.length > 0 && (
            <ul
              style={{
                marginTop: 8,
                paddingLeft: 16,
                color: "var(--ch-fg-2)",
                fontSize: 12.5,
                lineHeight: 1.55,
              }}
            >
              {achievements.map((a, i) => (
                <li key={`${i}-${a}`} style={{ marginBottom: 4 }}>
                  {a}
                </li>
              ))}
            </ul>
          )}
          <Group gap={6} mt={10} wrap="wrap">
            {e.technologies.map((tech) => (
              <Badge key={tech} variant="default" size="xs" className="mono">
                {tech}
              </Badge>
            ))}
          </Group>
          <Button
            mt="md"
            size="compact-xs"
            variant="default"
            leftSection={<Pencil size={12} />}
            onClick={onEdit}
          >
            Éditer
          </Button>
        </div>
      </Collapse>
    </div>
  );
}
