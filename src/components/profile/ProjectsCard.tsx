"use client";

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Stack,
  TagsInput,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { LocalizedTextInput } from "@/components/ui/LocalizedTextInput";
import {
  emptyLocalized,
  type Locale,
  type LocalizedText,
  pickLocalized,
} from "@/lib/i18n";
import { deleteProject, upsertProject } from "@/server/actions/profile";
import { translateField } from "@/server/actions/translator";

type ProjectRow = {
  id: string;
  name: string;
  description: unknown;
  technologies: string[];
  url: string | null;
  year: number;
};

type ProjectForm = {
  id?: string;
  name: string;
  description: LocalizedText;
  technologies: string[];
  url: string;
  year: number;
};
const CURRENT_YEAR = 2026;
const EMPTY: ProjectForm = {
  name: "",
  description: { fr: null, en: null },
  technologies: [],
  url: "",
  year: CURRENT_YEAR,
};

export function ProjectsCard({
  projects,
  locale,
}: {
  projects: ProjectRow[];
  locale: Locale;
}) {
  const t = useTranslations("profile");
  const tAct = useTranslations("actions");
  const [opened, ctl] = useDisclosure(false);
  const [form, setForm] = useState<ProjectForm>(EMPTY);
  const [pending, startTransition] = useTransition();

  function openNew() {
    setForm(EMPTY);
    ctl.open();
  }
  function openEdit(p: ProjectRow) {
    setForm({
      id: p.id,
      name: p.name,
      description: (p.description as LocalizedText | null) ?? emptyLocalized(),
      technologies: p.technologies,
      url: p.url ?? "",
      year: p.year,
    });
    ctl.open();
  }
  function save() {
    if (!form.name.trim()) {
      notifications.show({ color: "red", message: t("projectRequired") });
      return;
    }
    startTransition(async () => {
      try {
        await upsertProject({
          id: form.id,
          name: form.name.trim(),
          description: form.description,
          technologies: form.technologies,
          url: form.url || null,
          year: form.year,
        });
        notifications.show({ color: "green", message: tAct("saved") });
        ctl.close();
      } catch (e) {
        notifications.show({
          color: "red",
          message: e instanceof Error ? e.message : "Échec",
        });
      }
    });
  }
  function remove(id: string) {
    startTransition(async () => {
      await deleteProject(id);
      notifications.show({ color: "gray", message: tAct("deleted") });
    });
  }

  return (
    <Card>
      <Group justify="space-between" align="center" mb="sm">
        <Title order={3}>{t("projects")}</Title>
        <Group gap="xs">
          <Badge variant="default" size="sm" className="mono">
            {projects.length}
          </Badge>
          <Button
            size="compact-xs"
            variant="light"
            color="magenta"
            leftSection={<Plus size={13} />}
            onClick={openNew}
          >
            {tAct("add")}
          </Button>
        </Group>
      </Group>

      {projects.length === 0 ? (
        <Text c="dimmed" size="sm">
          {t("noProjects")}
        </Text>
      ) : (
        <Stack gap={0}>
          {projects.map((p) => {
            const desc = pickLocalized(
              p.description as LocalizedText | null,
              locale,
            );
            return (
              <Group
                key={p.id}
                gap={10}
                align="flex-start"
                wrap="nowrap"
                py={10}
                style={{ borderTop: "1px solid var(--ch-border-s)" }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Group gap={6} align="center">
                    <span style={{ fontSize: 13, fontWeight: 500 }}>
                      {p.name}
                    </span>
                    {p.url && (
                      <a
                        href={
                          /^https?:\/\//.test(p.url)
                            ? p.url
                            : `https://${p.url}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "var(--ch-accent-2)",
                          display: "inline-flex",
                        }}
                        aria-label={p.name}
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </Group>
                  {desc && (
                    <div style={{ fontSize: 12, color: "var(--ch-fg-2)" }}>
                      {desc}
                    </div>
                  )}
                  {p.technologies.length > 0 && (
                    <Group gap={4} mt={4} wrap="wrap">
                      {p.technologies.map((tech) => (
                        <Badge
                          key={tech}
                          size="xs"
                          variant="default"
                          color="gray"
                        >
                          {tech}
                        </Badge>
                      ))}
                    </Group>
                  )}
                </div>
                <span
                  className="mono"
                  style={{ fontSize: 11, color: "var(--ch-fg-3)" }}
                >
                  {p.year}
                </span>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={() => openEdit(p)}
                  aria-label={tAct("edit")}
                >
                  <Pencil size={13} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  onClick={() => remove(p.id)}
                  aria-label={tAct("delete")}
                >
                  <Trash2 size={13} />
                </ActionIcon>
              </Group>
            );
          })}
        </Stack>
      )}

      <Modal
        opened={opened}
        onClose={ctl.close}
        title={form.id ? t("editProject") : t("addProject")}
        size="lg"
        centered
      >
        <Stack gap="sm">
          <Group grow>
            <TextInput
              label={t("projectName")}
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.currentTarget.value }))
              }
              required
            />
            <NumberInput
              label={t("year")}
              value={form.year}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  year: typeof v === "number" ? v : CURRENT_YEAR,
                }))
              }
              min={1990}
              max={CURRENT_YEAR + 1}
            />
          </Group>
          <LocalizedTextInput
            label={t("projectDescription")}
            values={form.description}
            onChange={(v) => setForm((f) => ({ ...f, description: v }))}
            multiline
            rows={2}
            defaultLocale={locale}
            onTranslate={(source, target, text) =>
              translateField({
                source,
                target,
                text,
                context: "project.description",
              })
            }
          />
          <TagsInput
            label={t("technologies")}
            value={form.technologies}
            onChange={(v) => setForm((f) => ({ ...f, technologies: v }))}
            placeholder="React, Node, Postgres…"
          />
          <TextInput
            label="URL"
            value={form.url}
            onChange={(e) =>
              setForm((f) => ({ ...f, url: e.currentTarget.value }))
            }
            placeholder="github.com/jeandupont/projet"
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={ctl.close}>
              {tAct("cancel")}
            </Button>
            <Button color="magenta" onClick={save} loading={pending}>
              {tAct("save")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
}
