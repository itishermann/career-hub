"use client";

import {
  Button,
  Card,
  SegmentedControl,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { updateUiPreferences } from "@/server/actions/settings";

type Density = "dense" | "comfortable";
type Scheme = "light" | "dark" | "auto";

/**
 * UI preferences pane (density + colour scheme). Language is changed via the
 * header switcher (it needs a route change), so it is intentionally not here.
 */
export function PreferencesForm({
  initialDensity,
  initialScheme,
}: {
  initialDensity: Density;
  initialScheme: Scheme;
}) {
  const t = useTranslations("settings");
  const [density, setDensity] = useState<Density>(initialDensity);
  const [scheme, setScheme] = useState<Scheme>(initialScheme);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await updateUiPreferences({ density, colorScheme: scheme });
      notifications.show({ color: "green", message: t("prefsSaved") });
    });
  }

  return (
    <Card>
      <Stack gap="md">
        <Stack gap={6}>
          <Title order={4} style={{ fontSize: 13 }}>
            {t("density")}
          </Title>
          <SegmentedControl
            value={density}
            onChange={(v) => setDensity(v as Density)}
            data={[
              { value: "comfortable", label: t("comfortable") },
              { value: "dense", label: t("dense") },
            ]}
          />
        </Stack>
        <Stack gap={6}>
          <Title order={4} style={{ fontSize: 13 }}>
            {t("theme")}
          </Title>
          <SegmentedControl
            value={scheme}
            onChange={(v) => setScheme(v as Scheme)}
            data={[
              { value: "light", label: t("light") },
              { value: "dark", label: t("dark") },
              { value: "auto", label: "Auto" },
            ]}
          />
          <Text c="dimmed" size="xs">
            {t("uiLanguage")} — via le sélecteur du header.
          </Text>
        </Stack>
        <Button
          color="magenta"
          onClick={save}
          loading={pending}
          w="fit-content"
        >
          {t("savePrefs")}
        </Button>
      </Stack>
    </Card>
  );
}
