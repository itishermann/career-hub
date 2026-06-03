"use client";

import { Badge, Button, Group, Modal, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { generateCv, generateLm } from "@/server/actions/generations";

export type TemplateChoice = {
  name: string;
  description: string | null;
  atsCompliant: boolean;
};

export function GenerateModal({
  opened,
  onClose,
  type,
  templates,
  campaignId,
  language,
  subtitle,
}: {
  opened: boolean;
  onClose: () => void;
  type: "CV" | "COVER_LETTER";
  templates: TemplateChoice[];
  campaignId: string;
  language: "fr" | "en";
  subtitle?: string;
}) {
  const [selected, setSelected] = useState(templates[0]?.name ?? "");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function launch() {
    startTransition(async () => {
      try {
        type === "CV"
          ? await generateCv({ templateName: selected, campaignId, language })
          : await generateLm({ templateName: selected, campaignId, language });
        notifications.show({
          color: "green",
          message: "Ajouté à la file d'attente",
        });
        onClose();
        router.push("/tasks");
      } catch (e) {
        notifications.show({
          color: "red",
          message: e instanceof Error ? e.message : "Échec",
        });
      }
    });
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Générer ${type === "CV" ? "un CV" : "une lettre de motivation"}`}
      size="lg"
    >
      <Stack gap="md">
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={500} mb={6}>
            Template
          </Text>
          <Stack gap={8}>
            {templates.length === 0 && (
              <Text size="sm" c="dimmed">
                Aucun template disponible pour la langue{" "}
                {language.toUpperCase()}.
              </Text>
            )}
            {templates.map((tpl) => {
              const active = selected === tpl.name;
              return (
                <button
                  key={tpl.name}
                  type="button"
                  onClick={() => setSelected(tpl.name)}
                  style={{
                    textAlign: "left",
                    padding: "10px 14px",
                    background: active
                      ? "var(--ch-accent-bg)"
                      : "var(--ch-bg-1)",
                    border: active
                      ? "1px solid var(--ch-accent)"
                      : "1px solid var(--ch-border-m)",
                    borderRadius: 6,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 999,
                      border: active
                        ? "4px solid var(--ch-accent)"
                        : "1px solid var(--ch-border-l)",
                      background: active ? "#fff" : "var(--ch-bg-0)",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Group gap={6}>
                      <Text size="sm" fw={500} className="mono">
                        {tpl.name}
                      </Text>
                      {tpl.atsCompliant && (
                        <Badge size="xs" variant="light" color="green">
                          ATS
                        </Badge>
                      )}
                    </Group>
                    {tpl.description && (
                      <Text size="xs" c="dimmed">
                        {tpl.description}
                      </Text>
                    )}
                  </div>
                  <Badge size="xs" variant="default" className="mono">
                    {language.toUpperCase()}
                  </Badge>
                </button>
              );
            })}
          </Stack>
        </div>

        <Group
          justify="space-between"
          pt="sm"
          style={{ borderTop: "1px solid var(--ch-border-s)" }}
        >
          <Text size="xs" c="dimmed">
            {subtitle}
          </Text>
          <Group gap="xs">
            <Button variant="default" onClick={onClose}>
              Annuler
            </Button>
            <Button
              color="magenta"
              leftSection={<Sparkles size={14} />}
              disabled={!selected}
              loading={pending}
              onClick={launch}
            >
              Lancer la génération
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
