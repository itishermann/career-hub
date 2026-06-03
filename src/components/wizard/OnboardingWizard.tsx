"use client";

import {
  Alert,
  Card,
  PasswordInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { WizardShell } from "@/components/ui/WizardStep";
import { useRouter } from "@/i18n/navigation";
import { completeOnboarding } from "@/server/actions/settings";
import type { LlmConfig, LlmMode } from "@/server/llm/client";

export function OnboardingWizard({
  initialLocale,
  initialLlm,
}: {
  initialLocale: "fr" | "en";
  initialLlm: LlmConfig;
}) {
  const t = useTranslations("wizard");
  const tNav = useTranslations("nav");
  const tAct = useTranslations("actions");
  const tLlm = useTranslations("llm");
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();

  const [uiLocale, setUiLocale] = useState<"fr" | "en">(initialLocale);
  const [llmMode, setLlmMode] = useState<LlmMode>(initialLlm.mode);
  const [anthropicKey, setAnthropicKey] = useState(
    initialLlm.anthropic?.apiKey ?? "",
  );
  const [anthropicModel, setAnthropicModel] = useState(
    initialLlm.anthropic?.chatModel ?? "claude-opus-4-7",
  );
  const [localEndpoint, setLocalEndpoint] = useState(
    initialLlm.local?.endpoint ?? "",
  );
  const [localChat, setLocalChat] = useState(
    initialLlm.local?.chatModel ?? "llama3.3:70b",
  );
  const [localEmbed, setLocalEmbed] = useState(
    initialLlm.local?.embeddingModel ?? "nomic-embed-text",
  );
  const [name, setName] = useState("");
  const [city, setCity] = useState("");

  const stepDefs = [
    {
      key: "welcome",
      label: t("steps.welcome"),
      body: (
        <Card>
          <Stack gap="sm">
            <Title order={3}>{t("title")}</Title>
            <Text size="sm" c="dimmed">
              {t("welcomeBody")}
            </Text>
            <Text size="xs" c="dimmed" mt="sm">
              {t("selectUiLanguage")}
            </Text>
            <SegmentedControl
              value={uiLocale}
              onChange={(v) => setUiLocale(v as "fr" | "en")}
              data={[
                { value: "fr", label: "Français" },
                { value: "en", label: "English" },
              ]}
            />
          </Stack>
        </Card>
      ),
      canContinue: true,
    },
    {
      key: "llmMode",
      label: t("steps.llmMode"),
      body: (
        <Card>
          <Stack gap="sm">
            <Title order={3}>{tLlm("mode")}</Title>
            <SegmentedControl
              value={llmMode}
              onChange={(v) => setLlmMode(v as LlmMode)}
              data={[
                { value: "local", label: tLlm("modeLocal") },
                { value: "anthropic", label: tLlm("modeAnthropic") },
                { value: "mock", label: tLlm("modeMock") },
              ]}
            />
            {llmMode === "anthropic" && (
              <Alert color="yellow" variant="light">
                <Text size="sm">{tLlm("anthropicHint")}</Text>
              </Alert>
            )}
            {llmMode === "mock" && (
              <Alert variant="light" icon={<Sparkles size={14} />}>
                <Text size="sm">
                  Mode mock — pratique pour valider l'app sans clé API. Bascule
                  à tout moment via les paramètres.
                </Text>
              </Alert>
            )}
          </Stack>
        </Card>
      ),
      canContinue: true,
    },
    {
      key: "llmConfig",
      label: t("steps.llmConfig"),
      body:
        llmMode === "anthropic" ? (
          <Card>
            <Stack gap="sm">
              <Title order={3}>Anthropic</Title>
              <PasswordInput
                label={tLlm("apiKey")}
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.currentTarget.value)}
                placeholder="sk-ant-…"
              />
              <Select
                label={tLlm("chatModel")}
                data={[
                  { value: "claude-opus-4-7", label: "Claude Opus 4.7" },
                  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
                  {
                    value: "claude-haiku-4-5-20251001",
                    label: "Claude Haiku 4.5",
                  },
                ]}
                value={anthropicModel}
                onChange={(v) => v && setAnthropicModel(v)}
              />
            </Stack>
          </Card>
        ) : llmMode === "local" ? (
          <Card>
            <Stack gap="sm">
              <Title order={3}>{tLlm("modeLocal")}</Title>
              <Text c="dimmed" size="xs">
                {tLlm("localHint")}
              </Text>
              <TextInput
                label={tLlm("endpoint")}
                value={localEndpoint}
                onChange={(e) => setLocalEndpoint(e.currentTarget.value)}
                placeholder="http://localhost:11434/v1"
              />
              <TextInput
                label={tLlm("chatModel")}
                value={localChat}
                onChange={(e) => setLocalChat(e.currentTarget.value)}
              />
              <TextInput
                label={tLlm("embeddingModel")}
                value={localEmbed}
                onChange={(e) => setLocalEmbed(e.currentTarget.value)}
              />
            </Stack>
          </Card>
        ) : (
          <Card>
            <Stack gap="sm">
              <Title order={3}>{tLlm("modeMock")}</Title>
              <Text size="sm" c="dimmed">
                Aucune configuration requise en mode mock.
              </Text>
            </Stack>
          </Card>
        ),
      canContinue: true,
    },
    {
      key: "profile",
      label: t("steps.profile"),
      body: (
        <Card>
          <Stack gap="sm">
            <Title order={3}>Profil minimal</Title>
            <Text size="sm" c="dimmed">
              Le profil détaillé se complète plus tard. Là on a juste le minimum
              pour que les premiers CV te ressemblent.
            </Text>
            <TextInput
              label="Nom"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="Jean Dupont"
            />
            <TextInput
              label="Ville"
              value={city}
              onChange={(e) => setCity(e.currentTarget.value)}
              placeholder="Lyon, France"
            />
          </Stack>
        </Card>
      ),
      canContinue: true,
    },
    {
      key: "recap",
      label: t("steps.recap"),
      body: (
        <Card>
          <Stack gap="sm">
            <Title order={3}>{t("recapTitle")}</Title>
            <Text size="sm" c="dimmed">
              {t("recapBody")}
            </Text>
            {name && <Recap label="Nom" value={name} />}
            {city && <Recap label="Ville" value={city} />}
            <Recap label="Langue UI" value={uiLocale.toUpperCase()} />
            <Recap label="Mode LLM" value={llmMode} />
            {llmMode === "local" && (
              <Recap label="Endpoint" value={localEndpoint || "—"} />
            )}
            {llmMode === "anthropic" && (
              <Recap label="Modèle Anthropic" value={anthropicModel} />
            )}
          </Stack>
        </Card>
      ),
      canContinue: true,
    },
  ];

  function onFinish() {
    startTransition(async () => {
      const llm: LlmConfig = {
        mode: llmMode,
        anthropic: {
          apiKey: anthropicKey || undefined,
          chatModel: anthropicModel,
        },
        local: {
          endpoint: localEndpoint || undefined,
          chatModel: localChat,
          embeddingModel: localEmbed,
          embeddingDim: 768,
          contextLength: 32768,
        },
      };
      await completeOnboarding({ uiLocale, llmConfig: llm, name });
      notifications.show({
        color: "green",
        message: "Configuration enregistrée.",
      });
      router.push("/");
    });
  }

  return (
    <WizardShell
      title={t("title")}
      subtitle={t("subtitle")}
      steps={stepDefs}
      currentStep={step}
      onStepChange={(s) => s <= step && setStep(s)}
      onBack={() => setStep(Math.max(0, step - 1))}
      onNext={() => setStep(Math.min(stepDefs.length - 1, step + 1))}
      onFinish={onFinish}
      backLabel={tAct("back")}
      nextLabel={tAct("next")}
      finishLabel={tAct("finish")}
      pending={pending}
    />
  );
}

function Recap({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "6px 0",
      }}
    >
      <span style={{ fontSize: 12, color: "var(--ch-fg-3)" }}>{label}</span>
      <span style={{ fontSize: 13, fontFamily: "var(--ch-font-mono)" }}>
        {value}
      </span>
    </div>
  );
}
