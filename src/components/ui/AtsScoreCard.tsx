"use client";

import { Accordion, Badge, Card, Group, Progress, RingProgress, Stack, Text, Title } from "@mantine/core";
import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

type AtsScore = {
  global: number;
  breakdown: {
    extraction: number;
    structure: number;
    keywords: number | null;
    contextual: number;
  };
  warnings: string[];
  strengths: { title: string; detail: string }[];
  weaknesses: { title: string; detail: string }[];
  suggestions: {
    priority: "high" | "medium" | "low";
    section: string;
    suggestion: string;
    rationale: string;
  }[];
  matchedKeywords: { keyword: string; count: number; category: string; importance: number }[];
  missingKeywords: { keyword: string; importance: number; category: string }[];
};

function colorForScore(score: number): string {
  if (score < 50) return "red";
  if (score < 75) return "yellow";
  if (score < 90) return "green";
  return "magenta";
}

export function AtsScoreCard({ score }: { score: AtsScore }) {
  const t = useTranslations("ats");
  const color = colorForScore(score.global);

  return (
    <Card>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Stack gap={2}>
            <Title order={3}>{t("score")}</Title>
            <Text size="xs" c="dimmed">
              {t("breakdown")}
            </Text>
          </Stack>
          <RingProgress
            size={92}
            thickness={8}
            roundCaps
            sections={[{ value: score.global, color }]}
            label={
              <Text ta="center" fw={600} size="lg">
                {score.global}
              </Text>
            }
          />
        </Group>

        <Stack gap={6}>
          <Bar label={t("extraction")} value={score.breakdown.extraction} />
          <Bar label={t("structure")} value={score.breakdown.structure} />
          <Bar label={t("keywords")} value={score.breakdown.keywords ?? 0} muted={score.breakdown.keywords === null} />
          <Bar label={t("contextual")} value={score.breakdown.contextual} />
        </Stack>

        {score.warnings.length > 0 && (
          <Stack gap={4}>
            {score.warnings.map((w) => (
              <Group key={w} gap={6}>
                <AlertTriangle size={12} color="var(--ch-warning)" />
                <Text size="xs" c="dimmed">
                  {w}
                </Text>
              </Group>
            ))}
          </Stack>
        )}

        <Accordion variant="default" radius="md" multiple defaultValue={["suggestions"]}>
          {score.strengths.length > 0 && (
            <Accordion.Item value="strengths">
              <Accordion.Control>
                <Group gap={6}>
                  <CheckCircle2 size={12} color="var(--ch-success)" />
                  <Text size="sm">{t("strengths")}</Text>
                  <Badge size="xs" variant="default">
                    {score.strengths.length}
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="xs">
                  {score.strengths.map((s) => (
                    <Stack key={s.title} gap={2}>
                      <Text size="sm" fw={500}>
                        {s.title}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {s.detail}
                      </Text>
                    </Stack>
                  ))}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          )}

          {score.weaknesses.length > 0 && (
            <Accordion.Item value="weaknesses">
              <Accordion.Control>
                <Group gap={6}>
                  <AlertTriangle size={12} color="var(--ch-warning)" />
                  <Text size="sm">{t("weaknesses")}</Text>
                  <Badge size="xs" variant="default">
                    {score.weaknesses.length}
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="xs">
                  {score.weaknesses.map((w) => (
                    <Stack key={w.title} gap={2}>
                      <Text size="sm" fw={500}>
                        {w.title}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {w.detail}
                      </Text>
                    </Stack>
                  ))}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          )}

          {score.suggestions.length > 0 && (
            <Accordion.Item value="suggestions">
              <Accordion.Control>
                <Group gap={6}>
                  <Sparkles size={12} color="var(--ch-accent-2)" />
                  <Text size="sm">{t("suggestions")}</Text>
                  <Badge size="xs" variant="light" color="magenta">
                    {score.suggestions.length}
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="xs">
                  {score.suggestions.map((s, i) => (
                    <Card key={i} padding="xs" radius="md" withBorder>
                      <Group gap={6} mb={4}>
                        <Badge
                          size="xs"
                          color={
                            s.priority === "high"
                              ? "red"
                              : s.priority === "medium"
                                ? "yellow"
                                : "gray"
                          }
                          variant="light"
                        >
                          {s.priority === "high"
                            ? t("priorityHigh")
                            : s.priority === "medium"
                              ? t("priorityMedium")
                              : t("priorityLow")}
                        </Badge>
                        <Badge size="xs" variant="default">
                          {s.section}
                        </Badge>
                      </Group>
                      <Text size="sm">{s.suggestion}</Text>
                      <Text size="xs" c="dimmed" mt={2}>
                        {s.rationale}
                      </Text>
                    </Card>
                  ))}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          )}

          {(score.matchedKeywords.length > 0 || score.missingKeywords.length > 0) && (
            <Accordion.Item value="keywords">
              <Accordion.Control>
                <Group gap={6}>
                  <Text size="sm">{t("keywords")}</Text>
                  <Badge size="xs" variant="default">
                    {score.matchedKeywords.length}/{score.matchedKeywords.length + score.missingKeywords.length}
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="sm">
                  {score.matchedKeywords.length > 0 && (
                    <Stack gap={4}>
                      <Text size="xs" tt="uppercase" c="dimmed">
                        {t("matchedKeywords")}
                      </Text>
                      <Group gap={4} wrap="wrap">
                        {score.matchedKeywords.map((k) => (
                          <Badge key={k.keyword} variant="light" color="green" size="xs">
                            {k.keyword}
                            <span style={{ opacity: 0.5, marginLeft: 4 }}>×{k.count}</span>
                          </Badge>
                        ))}
                      </Group>
                    </Stack>
                  )}
                  {score.missingKeywords.length > 0 && (
                    <Stack gap={4}>
                      <Text size="xs" tt="uppercase" c="dimmed">
                        {t("missingKeywords")}
                      </Text>
                      <Group gap={4} wrap="wrap">
                        {score.missingKeywords.map((k) => (
                          <Badge key={k.keyword} variant="light" color="red" size="xs">
                            {k.keyword}
                          </Badge>
                        ))}
                      </Group>
                    </Stack>
                  )}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          )}
        </Accordion>
      </Stack>
    </Card>
  );
}

function Bar({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <Stack gap={2}>
      <Group justify="space-between">
        <Text size="xs" c="dimmed">
          {label}
        </Text>
        <Text size="xs" fw={500} c={muted ? "dimmed" : undefined}>
          {muted ? "—" : value}
        </Text>
      </Group>
      <Progress
        value={muted ? 0 : value}
        size="sm"
        color={muted ? "gray" : colorForScore(value)}
      />
    </Stack>
  );
}
