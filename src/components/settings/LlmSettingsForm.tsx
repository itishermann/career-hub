"use client";

import {
  Alert,
  Button,
  Card,
  NumberInput,
  PasswordInput,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import {
  type LocalConnTestResult,
  testLocalConnection,
} from "@/server/actions/llm-test";
import { updateLlmConfig } from "@/server/actions/settings";
import type {
  EmbeddingProvider,
  LlmConfig,
  LlmMode,
} from "@/server/llm/client";

const ANTHROPIC_MODELS = [
  { value: "claude-opus-4-7", label: "Claude Opus 4.7" },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
];

const CLAUDE_MODELS = [
  { value: "sonnet", label: "Sonnet" },
  { value: "opus", label: "Opus" },
  { value: "haiku", label: "Haiku" },
];

export function LlmSettingsForm({
  initialConfig,
}: {
  initialConfig: LlmConfig;
}) {
  const t = useTranslations("llm");
  const tAct = useTranslations("actions");
  const [mode, setMode] = useState<LlmMode>(initialConfig.mode);
  const [anthropicKey, setAnthropicKey] = useState(
    initialConfig.anthropic?.apiKey ?? "",
  );
  const [anthropicModel, setAnthropicModel] = useState(
    initialConfig.anthropic?.chatModel ?? "claude-opus-4-7",
  );
  const [localEndpoint, setLocalEndpoint] = useState(
    initialConfig.local?.endpoint ?? "",
  );
  const [localKey, setLocalKey] = useState(initialConfig.local?.apiKey ?? "");
  const [localChat, setLocalChat] = useState(
    initialConfig.local?.chatModel ?? "llama3.3:70b",
  );
  const [localCtx, setLocalCtx] = useState<number>(
    initialConfig.local?.contextLength ?? 32768,
  );

  // Claude (CLI + SDK)
  const [claudeCliBin, setClaudeCliBin] = useState(
    initialConfig.claudeCli?.binPath ?? "claude",
  );
  const [claudeCliModel, setClaudeCliModel] = useState(
    initialConfig.claudeCli?.chatModel ?? "sonnet",
  );
  const [claudeSdkModel, setClaudeSdkModel] = useState(
    initialConfig.claudeSdk?.chatModel ?? "sonnet",
  );

  // Embeddings (decoupled from chat mode)
  const [embProvider, setEmbProvider] = useState<EmbeddingProvider>(
    initialConfig.embeddings?.provider ??
      (initialConfig.local?.endpoint ? "ollama" : "none"),
  );
  const [embEndpoint, setEmbEndpoint] = useState(
    initialConfig.embeddings?.endpoint ?? initialConfig.local?.endpoint ?? "",
  );
  const [embModel, setEmbModel] = useState(
    initialConfig.embeddings?.model ??
      initialConfig.local?.embeddingModel ??
      "nomic-embed-text",
  );
  const [embDim, setEmbDim] = useState<number>(
    initialConfig.embeddings?.dim ?? initialConfig.local?.embeddingDim ?? 768,
  );
  const [embFallback, setEmbFallback] = useState<boolean>(
    initialConfig.embeddings?.fallbackTransformers ?? true,
  );
  const [embTransformersModel, setEmbTransformersModel] = useState(
    initialConfig.embeddings?.transformersModel ??
      "nomic-ai/nomic-embed-text-v1.5",
  );

  const [pending, startTransition] = useTransition();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<LocalConnTestResult | null>(
    null,
  );

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testLocalConnection({
        endpoint: localEndpoint,
        apiKey: localKey || undefined,
        embeddingModel: embModel,
        embeddingDim: embDim,
      });
      setTestResult(result);
    } catch (err) {
      setTestResult({
        ok: false,
        models: [],
        error: err instanceof Error ? err.message : "Échec du test",
      });
    } finally {
      setTesting(false);
    }
  }

  function save() {
    const next: LlmConfig = {
      mode,
      anthropic: {
        apiKey: anthropicKey || undefined,
        chatModel: anthropicModel,
      },
      local: {
        endpoint: localEndpoint || undefined,
        apiKey: localKey || undefined,
        chatModel: localChat,
        embeddingModel: embModel,
        embeddingDim: embDim,
        contextLength: localCtx,
      },
      claudeCli: {
        binPath: claudeCliBin || "claude",
        chatModel: claudeCliModel,
        timeoutMs: initialConfig.claudeCli?.timeoutMs ?? 300_000,
      },
      claudeSdk: {
        chatModel: claudeSdkModel,
        timeoutMs: initialConfig.claudeSdk?.timeoutMs ?? 300_000,
      },
      embeddings: {
        provider: embProvider,
        endpoint: embEndpoint || undefined,
        model: embModel,
        dim: embDim,
        fallbackTransformers: embFallback,
        transformersModel: embTransformersModel,
      },
    };
    startTransition(async () => {
      await updateLlmConfig(next);
      notifications.show({
        color: "green",
        message: "Configuration LLM enregistrée.",
      });
    });
  }

  return (
    <Stack gap="md">
      <Card>
        <Stack gap="sm">
          <Title order={3}>{t("mode")}</Title>
          <SegmentedControl
            value={mode}
            onChange={(v) => setMode(v as LlmMode)}
            data={[
              { value: "mock", label: t("modeMock") },
              { value: "local", label: t("modeLocal") },
              { value: "anthropic", label: t("modeAnthropic") },
              { value: "claude_cli", label: t("modeClaudeCli") },
              { value: "claude_sdk", label: t("modeClaudeSdk") },
            ]}
          />
          {mode === "anthropic" && (
            <Alert color="yellow" variant="light">
              <Text size="sm">{t("anthropicHint")}</Text>
            </Alert>
          )}
          {(mode === "claude_cli" || mode === "claude_sdk") && (
            <Alert color="grape" variant="light">
              <Text size="sm">{t("claudeHint")}</Text>
            </Alert>
          )}
        </Stack>
      </Card>

      {mode === "anthropic" && (
        <Card>
          <Stack gap="sm">
            <Title order={3}>Anthropic</Title>
            <PasswordInput
              label={t("apiKey")}
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.currentTarget.value)}
              placeholder="sk-ant-…"
            />
            <Select
              label={t("chatModel")}
              data={ANTHROPIC_MODELS}
              value={anthropicModel}
              onChange={(v) => v && setAnthropicModel(v)}
            />
          </Stack>
        </Card>
      )}

      {mode === "claude_cli" && (
        <Card>
          <Stack gap="sm">
            <Title order={3}>Claude CLI (`claude -p`)</Title>
            <Text c="dimmed" size="xs">
              {t("claudeCliHint")}
            </Text>
            <TextInput
              label={t("binPath")}
              value={claudeCliBin}
              onChange={(e) => setClaudeCliBin(e.currentTarget.value)}
              placeholder="claude"
            />
            <Select
              label={t("chatModel")}
              data={CLAUDE_MODELS}
              value={claudeCliModel}
              onChange={(v) => v && setClaudeCliModel(v)}
            />
          </Stack>
        </Card>
      )}

      {mode === "claude_sdk" && (
        <Card>
          <Stack gap="sm">
            <Title order={3}>Claude Agent SDK</Title>
            <Text c="dimmed" size="xs">
              {t("claudeSdkHint")}
            </Text>
            <Select
              label={t("chatModel")}
              data={CLAUDE_MODELS}
              value={claudeSdkModel}
              onChange={(v) => v && setClaudeSdkModel(v)}
            />
          </Stack>
        </Card>
      )}

      {mode === "local" && (
        <Card>
          <Stack gap="sm">
            <Title order={3}>Endpoint local</Title>
            <Text c="dimmed" size="xs">
              {t("localHint")}
            </Text>
            <TextInput
              label={t("endpoint")}
              value={localEndpoint}
              onChange={(e) => setLocalEndpoint(e.currentTarget.value)}
              placeholder="http://192.168.1.42:11434/v1"
            />
            <PasswordInput
              label={`${t("apiKey")} (optionnel)`}
              value={localKey}
              onChange={(e) => setLocalKey(e.currentTarget.value)}
            />
            <TextInput
              label={t("chatModel")}
              value={localChat}
              onChange={(e) => setLocalChat(e.currentTarget.value)}
            />
            <NumberInput
              label={t("contextLength")}
              description={t("contextLengthHint")}
              value={localCtx}
              onChange={(v) => typeof v === "number" && setLocalCtx(v)}
              min={2048}
              max={262144}
              step={1024}
              thousandSeparator=" "
            />
            <Button
              variant="default"
              onClick={testConnection}
              loading={testing}
              disabled={!localEndpoint}
            >
              {t("testConnection")}
            </Button>
            {testResult && (
              <Alert
                variant="light"
                color={testResult.ok ? "green" : "red"}
                title={
                  testResult.ok ? t("connectionOk") : t("connectionFailed")
                }
              >
                <Stack gap={4}>
                  {testResult.models.length > 0 && (
                    <Text size="xs" className="mono">
                      Modèles : {testResult.models.join(", ")}
                    </Text>
                  )}
                  {testResult.error && (
                    <Text size="xs" c="red">
                      {testResult.error}
                    </Text>
                  )}
                </Stack>
              </Alert>
            )}
          </Stack>
        </Card>
      )}

      {mode === "mock" && (
        <Alert color="gray" variant="light" icon={<Sparkles size={14} />}>
          <Text size="sm">{t("mockHint")}</Text>
        </Alert>
      )}

      {/* Embeddings — INDEPENDENT of the chat mode. */}
      <Card>
        <Stack gap="sm">
          <Title order={3}>{t("embeddings")}</Title>
          <Text c="dimmed" size="xs">
            {t("embeddingsHint")}
          </Text>
          <SegmentedControl
            value={embProvider}
            onChange={(v) => setEmbProvider(v as EmbeddingProvider)}
            data={[
              { value: "none", label: t("embNone") },
              { value: "ollama", label: t("embOllama") },
              { value: "transformers", label: t("embTransformers") },
            ]}
          />

          {embProvider === "ollama" && (
            <>
              <TextInput
                label={t("endpoint")}
                value={embEndpoint}
                onChange={(e) => setEmbEndpoint(e.currentTarget.value)}
                placeholder="http://192.168.1.196:11434/v1"
              />
              <TextInput
                label={t("embeddingModel")}
                value={embModel}
                onChange={(e) => setEmbModel(e.currentTarget.value)}
              />
              <Switch
                label={t("embFallback")}
                checked={embFallback}
                onChange={(e) => setEmbFallback(e.currentTarget.checked)}
              />
            </>
          )}

          {embProvider === "transformers" && (
            <TextInput
              label={t("embTransformersModel")}
              description={t("embTransformersHint")}
              value={embTransformersModel}
              onChange={(e) => setEmbTransformersModel(e.currentTarget.value)}
            />
          )}

          {embProvider !== "none" && (
            <NumberInput
              label={t("embeddingDim")}
              description={t("embDimHint")}
              value={embDim}
              onChange={(v) => typeof v === "number" && setEmbDim(v)}
              min={64}
              max={4096}
            />
          )}
        </Stack>
      </Card>

      <Button color="magenta" onClick={save} loading={pending}>
        {tAct("save")}
      </Button>
    </Stack>
  );
}
