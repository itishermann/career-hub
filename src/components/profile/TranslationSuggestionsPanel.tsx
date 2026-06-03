"use client";

import { Badge, Button, Card, Group, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Check, Languages, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  applyTranslationSuggestion,
  rejectTranslationSuggestion,
  type TranslationSuggestionView,
} from "@/server/actions/translation-suggestions";

export function TranslationSuggestionsPanel({
  suggestions,
}: {
  suggestions: TranslationSuggestionView[];
}) {
  const t = useTranslations("translations");
  if (suggestions.length === 0) return null;

  return (
    <Card withBorder padding="md" radius="md" mb="md">
      <Group gap={8} mb="sm">
        <Languages size={16} />
        <Text fw={600}>{t("title")}</Text>
        <Badge size="sm" variant="light" color="magenta">
          {suggestions.length}
        </Badge>
      </Group>
      <Text size="xs" c="dimmed" mb="md">
        {t("hint")}
      </Text>
      <Stack gap="sm">
        {suggestions.map((s) => (
          <SuggestionRow key={s.id} suggestion={s} t={t} />
        ))}
      </Stack>
    </Card>
  );
}

function SuggestionRow({
  suggestion,
  t,
}: {
  suggestion: TranslationSuggestionView;
  t: ReturnType<typeof useTranslations>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const resolve = (action: "apply" | "reject") =>
    startTransition(async () => {
      try {
        if (action === "apply") await applyTranslationSuggestion(suggestion.id);
        else await rejectTranslationSuggestion(suggestion.id);
        router.refresh();
      } catch (e) {
        notifications.show({
          color: "red",
          message: e instanceof Error ? e.message : "Error",
        });
      }
    });

  return (
    <Card withBorder padding="sm" radius="sm" bg="var(--ch-bg-1)">
      <Group justify="space-between" wrap="nowrap" mb={6}>
        <Group gap={6}>
          <Badge size="xs" variant="default" className="mono">
            {suggestion.entityType}.{suggestion.field}
          </Badge>
          <Badge size="xs" variant="light" className="mono">
            {suggestion.sourceLang.toUpperCase()} →{" "}
            {suggestion.targetLang.toUpperCase()}
          </Badge>
        </Group>
        <Group gap="xs">
          <Button
            size="xs"
            variant="light"
            color="green"
            leftSection={<Check size={12} />}
            loading={pending}
            onClick={() => resolve("apply")}
          >
            {t("apply")}
          </Button>
          <Button
            size="xs"
            variant="subtle"
            color="gray"
            leftSection={<X size={12} />}
            loading={pending}
            onClick={() => resolve("reject")}
          >
            {t("reject")}
          </Button>
        </Group>
      </Group>
      <Text size="xs" c="dimmed" lineClamp={2}>
        {suggestion.sourceText}
      </Text>
      <Text size="sm" mt={4} style={{ whiteSpace: "pre-wrap" }}>
        {suggestion.suggestedText}
      </Text>
    </Card>
  );
}
