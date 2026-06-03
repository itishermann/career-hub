"use client";

import { Badge, Button, Card, Group, Stack, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { LocalizedTextInput } from "@/components/ui/LocalizedTextInput";
import type { LocalizedText } from "@/lib/i18n";
import { upsertProfileSection } from "@/server/actions/profile";
import { translateField } from "@/server/actions/translator";

export function PitchCard({ initialValue }: { initialValue: LocalizedText }) {
  const t = useTranslations("profile");
  const tAct = useTranslations("actions");
  const [value, setValue] = useState<LocalizedText>(initialValue);
  const [pending, startTransition] = useTransition();

  const dirty = JSON.stringify(value) !== JSON.stringify(initialValue);
  const wordCount = (value.fr ?? value.en ?? "")
    .split(/\s+/)
    .filter(Boolean).length;

  function save() {
    startTransition(async () => {
      await upsertProfileSection({ sectionType: "pitch", contentMd: value });
      notifications.show({ color: "green", message: "Pitch enregistré." });
    });
  }

  return (
    <Card>
      <Group justify="space-between" align="center" mb="sm">
        <Group gap={8}>
          <Sparkles size={14} color="var(--ch-accent-2)" />
          <Title order={3}>{t("pitch")}</Title>
        </Group>
        <Badge variant="default" size="sm" className="mono">
          {wordCount} {wordCount > 1 ? "mots" : "mot"}
        </Badge>
      </Group>
      <Stack gap="xs">
        <LocalizedTextInput
          values={value}
          multiline
          rows={4}
          placeholder={t("pitchPlaceholder")}
          hint={t("pitchHint")}
          onChange={setValue}
          onTranslate={async (source, target, text) =>
            translateField({ source, target, text, context: "pitch" })
          }
        />
        <Group justify="flex-end" gap="xs">
          {dirty && (
            <span
              style={{
                fontSize: 11,
                color: "var(--ch-warning)",
                alignSelf: "center",
              }}
            >
              modifications non enregistrées
            </span>
          )}
          <Button
            size="xs"
            color="magenta"
            onClick={save}
            loading={pending}
            disabled={!dirty}
          >
            {tAct("save")}
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
