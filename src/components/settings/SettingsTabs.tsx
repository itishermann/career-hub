"use client";

import {
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import {
  AlertTriangle,
  Key,
  RotateCcw,
  Settings as SettingsIcon,
  SlidersHorizontal,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { restartOnboarding } from "@/server/actions/settings";
import type { LlmConfig } from "@/server/llm/client";
import { ApiTokensForm } from "./ApiTokensForm";
import { LlmSettingsForm } from "./LlmSettingsForm";
import { PreferencesForm } from "./PreferencesForm";

export type SettingsTokenView = {
  id: string;
  name: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
};

type Props = {
  locale: "fr" | "en";
  email: string;
  uiLocale: string;
  density: "dense" | "comfortable";
  colorScheme: "light" | "dark" | "auto";
  llmConfig: LlmConfig;
  tokens: SettingsTokenView[];
};

export function SettingsTabs(props: Props) {
  const t = useTranslations("settings");
  const [pending, startTransition] = useTransition();

  function rerun() {
    startTransition(async () => {
      await restartOnboarding(props.locale);
    });
  }

  return (
    <Tabs
      defaultValue="account"
      orientation="vertical"
      variant="pills"
      color="magenta"
      style={{ gap: 28 }}
    >
      <Tabs.List style={{ minWidth: 210, gap: 4 }}>
        <Tabs.Tab value="account" leftSection={<User size={15} />}>
          {t("account")}
        </Tabs.Tab>
        <Tabs.Tab value="llm" leftSection={<SettingsIcon size={15} />}>
          {t("llm")}
        </Tabs.Tab>
        <Tabs.Tab value="tokens" leftSection={<Key size={15} />}>
          {t("apiTokens")}
        </Tabs.Tab>
        <Tabs.Tab value="prefs" leftSection={<SlidersHorizontal size={15} />}>
          {t("preferences")}
        </Tabs.Tab>
        <Tabs.Tab value="danger" leftSection={<AlertTriangle size={15} />}>
          {t("dangerZone")}
        </Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="account" style={{ flex: 1 }}>
        <Card>
          <Stack gap="md">
            <Stack gap={2}>
              <Title order={4} style={{ fontSize: 13 }}>
                Email
              </Title>
              <Text size="sm" className="mono">
                {props.email}
              </Text>
            </Stack>
            <Stack gap={2}>
              <Title order={4} style={{ fontSize: 13 }}>
                {t("uiLanguage")}
              </Title>
              <Text size="sm">{props.uiLocale.toUpperCase()}</Text>
            </Stack>
          </Stack>
        </Card>
      </Tabs.Panel>

      <Tabs.Panel value="llm" style={{ flex: 1 }}>
        <LlmSettingsForm initialConfig={props.llmConfig} />
      </Tabs.Panel>

      <Tabs.Panel value="tokens" style={{ flex: 1 }}>
        <Stack gap="md">
          <ApiTokensForm />
          <Card padding={0}>
            {props.tokens.length === 0 ? (
              <Text c="dimmed" size="sm" p="lg">
                {t("noTokens")}
              </Text>
            ) : (
              props.tokens.map((tok) => (
                <Group
                  key={tok.id}
                  justify="space-between"
                  p="md"
                  style={{ borderTop: "1px solid var(--ch-border-s)" }}
                >
                  <Stack gap={2}>
                    <Title order={4} style={{ fontSize: 13 }}>
                      {tok.name}
                    </Title>
                    <Text size="xs" c="dimmed">
                      {tok.scopes.length > 0
                        ? tok.scopes.join(", ")
                        : "— pas de scopes —"}
                    </Text>
                    <Text size="xs" c="dimmed" className="mono">
                      last used: {tok.lastUsedAt ?? "—"}
                    </Text>
                  </Stack>
                  <Badge size="xs" variant="default">
                    {tok.expiresAt ? `expire ${tok.expiresAt}` : "no expiry"}
                  </Badge>
                </Group>
              ))
            )}
          </Card>
        </Stack>
      </Tabs.Panel>

      <Tabs.Panel value="prefs" style={{ flex: 1 }}>
        <PreferencesForm
          initialDensity={props.density}
          initialScheme={props.colorScheme}
        />
      </Tabs.Panel>

      <Tabs.Panel value="danger" style={{ flex: 1 }}>
        <Card style={{ borderColor: "var(--ch-danger, #c92a2a)" }}>
          <Stack gap="sm">
            <Group gap={8}>
              <AlertTriangle size={15} color="var(--ch-danger, #c92a2a)" />
              <Title order={3} style={{ fontSize: 14 }}>
                {t("rerunWizard")}
              </Title>
            </Group>
            <Text c="dimmed" size="sm">
              {t("rerunWizardHint")}
            </Text>
            <Button
              variant="default"
              leftSection={<RotateCcw size={14} />}
              onClick={rerun}
              loading={pending}
              w="fit-content"
            >
              {t("rerunWizard")}
            </Button>
          </Stack>
        </Card>
      </Tabs.Panel>
    </Tabs>
  );
}
