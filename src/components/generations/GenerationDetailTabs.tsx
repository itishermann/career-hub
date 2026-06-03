"use client";

import {
  Alert,
  Badge,
  Card,
  Code,
  Group,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";
import { AlertTriangle, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { RecompileButton } from "./RecompileButton";

/**
 * Tabbed inspector for a generation. Client component because Mantine's
 * compound Tabs.* are static properties that resolve to undefined across the
 * RSC boundary. The Server page passes only serializable strings.
 */
export function GenerationDetailTabs({
  generationId,
  hasPdf,
  fileName,
  outputTypst,
  llmPrompt,
  snapshotJson,
  compileError,
}: {
  generationId: string;
  hasPdf: boolean;
  fileName: string;
  outputTypst: string;
  llmPrompt: string;
  snapshotJson: string;
  compileError: string | null;
}) {
  const t = useTranslations("generation");
  const codeStyle = { maxHeight: 680, overflow: "auto", fontSize: 11 } as const;

  return (
    <Card padding={0}>
      <Tabs defaultValue="preview">
        <Tabs.List px="lg">
          <Tabs.Tab value="preview">{t("preview")}</Tabs.Tab>
          <Tabs.Tab value="code">{t("code")}</Tabs.Tab>
          <Tabs.Tab value="prompt">{t("prompt")}</Tabs.Tab>
          <Tabs.Tab value="snapshot">{t("snapshot")}</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="preview" p="lg">
          {hasPdf ? (
            <div
              style={{
                border: "1px solid var(--ch-border-s)",
                borderRadius: 8,
                overflow: "hidden",
                background: "var(--ch-bg-0)",
              }}
            >
              <Group
                gap={8}
                px="md"
                py="xs"
                style={{
                  borderBottom: "1px solid var(--ch-border-s)",
                  background: "var(--ch-bg-1)",
                }}
              >
                <FileText size={14} color="var(--ch-fg-3)" />
                <Text size="xs" className="mono">
                  {fileName}
                </Text>
                <Badge size="xs" variant="default" className="mono">
                  A4
                </Badge>
                <span style={{ flex: 1 }} />
                <Text size="xs" c="dimmed" className="mono">
                  PDF/UA-1 ✓
                </Text>
              </Group>
              <iframe
                title="PDF preview"
                src={`/api/generations/${generationId}/pdf`}
                style={{
                  width: "100%",
                  height: 680,
                  border: "none",
                  display: "block",
                }}
              />
              <Group
                gap={10}
                px="md"
                py={6}
                style={{
                  borderTop: "1px solid var(--ch-border-s)",
                  background: "var(--ch-bg-1)",
                  fontSize: 11,
                }}
              >
                <Text size="xs" c="dimmed" className="mono">
                  Typst 0.14.2
                </Text>
                <Text size="xs" c="dimmed">
                  ·
                </Text>
                <Text size="xs" c="dimmed" className="mono">
                  PDF/UA-1
                </Text>
              </Group>
            </div>
          ) : (
            <Stack gap="md">
              <Text c="dimmed" size="sm">
                {t("noPdf")}
              </Text>
              {compileError ? (
                <Alert
                  variant="light"
                  color="red"
                  icon={<AlertTriangle size={16} />}
                  title={t("compileError")}
                >
                  <Code
                    block
                    style={{
                      maxHeight: 240,
                      overflow: "auto",
                      fontSize: 11,
                      background: "transparent",
                    }}
                  >
                    {compileError}
                  </Code>
                </Alert>
              ) : null}
              <Group>
                <RecompileButton generationId={generationId} />
              </Group>
            </Stack>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="code" p="lg">
          <Code block style={codeStyle}>
            {outputTypst}
          </Code>
        </Tabs.Panel>

        <Tabs.Panel value="prompt" p="lg">
          <Code block style={codeStyle}>
            {llmPrompt}
          </Code>
        </Tabs.Panel>

        <Tabs.Panel value="snapshot" p="lg">
          <Code block style={codeStyle}>
            {snapshotJson}
          </Code>
        </Tabs.Panel>
      </Tabs>
    </Card>
  );
}
