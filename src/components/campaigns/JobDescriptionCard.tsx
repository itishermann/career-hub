"use client";

import {
  Badge,
  Button,
  Card,
  Group,
  SegmentedControl,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { RefreshCw, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { extractCampaignKeywords } from "@/server/actions/ats";
import type { AtsKeywords } from "@/server/llm/prompts/ats-keyword-extractor";

type FlatKeyword = { keyword: string; importance: number };

function flatten(kw: AtsKeywords): FlatKeyword[] {
  return [
    ...kw.hard_skills.map((k) => ({
      keyword: k.keyword,
      importance: k.importance,
    })),
    ...kw.domain_keywords.map((k) => ({
      keyword: k.keyword,
      importance: k.importance,
    })),
    ...kw.experience_signals.map((k) => ({
      keyword: k.keyword,
      importance: k.importance,
    })),
    ...kw.soft_skills.map((k) => ({
      keyword: k.keyword,
      importance: k.importance,
    })),
  ]
    .filter(
      (k, i, arr) =>
        arr.findIndex(
          (x) => x.keyword.toLowerCase() === k.keyword.toLowerCase(),
        ) === i,
    )
    .sort((a, b) => b.importance - a.importance);
}

export function JobDescriptionCard({
  campaignId,
  jobDescription,
  initialKeywords,
  cachedHint,
}: {
  campaignId: string;
  jobDescription: string | null;
  initialKeywords: AtsKeywords | null;
  cachedHint?: string;
}) {
  const [view, setView] = useState<"source" | "preview">("source");
  const [keywords, setKeywords] = useState<AtsKeywords | null>(initialKeywords);
  const [pending, startTransition] = useTransition();

  const wordCount = jobDescription
    ? jobDescription.split(/\s+/).filter(Boolean).length
    : 0;
  const flat = keywords ? flatten(keywords) : [];

  function extract() {
    startTransition(async () => {
      try {
        const result = await extractCampaignKeywords(campaignId);
        setKeywords(result.keywords);
        notifications.show({
          color: "green",
          message: result.cached
            ? "Mots-clés (cache)."
            : "Mots-clés ATS extraits.",
        });
      } catch (err) {
        notifications.show({
          color: "red",
          message: err instanceof Error ? err.message : "Extraction échouée",
        });
      }
    });
  }

  return (
    <Card padding={0}>
      <Group
        justify="space-between"
        align="center"
        px="lg"
        py="sm"
        style={{ borderBottom: "1px solid var(--ch-border-s)" }}
      >
        <Group gap="xs">
          <Title order={3}>Description du poste</Title>
          {jobDescription && (
            <Badge variant="default" size="sm" className="mono">
              {wordCount} mots
            </Badge>
          )}
        </Group>
        {jobDescription && (
          <SegmentedControl
            size="xs"
            value={view}
            onChange={(v) => setView(v as "source" | "preview")}
            data={[
              { value: "source", label: "Source" },
              { value: "preview", label: "Aperçu" },
            ]}
          />
        )}
      </Group>

      {!jobDescription ? (
        <Text c="dimmed" size="sm" p="lg">
          Pas de description de poste pour cette campagne.
        </Text>
      ) : view === "source" ? (
        <Text
          component="pre"
          style={{
            margin: 0,
            padding: "16px 18px",
            whiteSpace: "pre-wrap",
            fontFamily: "var(--ch-font-mono)",
            fontSize: 12,
            color: "var(--ch-fg-2)",
            lineHeight: 1.6,
            maxHeight: 360,
            overflow: "auto",
          }}
        >
          {jobDescription}
        </Text>
      ) : (
        <div style={{ padding: "16px 18px", maxHeight: 360, overflow: "auto" }}>
          {jobDescription.split(/\n\n+/).map((para, i) => (
            <p
              key={i}
              style={{
                margin: "0 0 12px",
                color: "var(--ch-fg-1)",
                fontSize: 13.5,
                lineHeight: 1.6,
              }}
            >
              {para}
            </p>
          ))}
        </div>
      )}

      {jobDescription && (
        <>
          <Group
            px="lg"
            py="xs"
            gap="xs"
            style={{
              borderTop: "1px solid var(--ch-border-s)",
              background: "var(--ch-bg-0)",
            }}
          >
            <Sparkles size={13} color="var(--ch-accent-2)" />
            <Text size="xs" c="dimmed">
              Mots-clés ATS {keywords ? `· ${flat.length}` : ""}
            </Text>
            {cachedHint && keywords && (
              <Text size="xs" c="dimmed" className="mono">
                {cachedHint}
              </Text>
            )}
            <span style={{ flex: 1 }} />
            <Button
              size="compact-xs"
              variant="subtle"
              color="gray"
              leftSection={<RefreshCw size={12} />}
              onClick={extract}
              loading={pending}
            >
              {keywords ? "Re-extraire" : "Extraire"}
            </Button>
          </Group>
          {flat.length > 0 && (
            <Group px="lg" pb="md" pt={4} gap={6}>
              {flat.map((k, i) => (
                <Badge
                  key={k.keyword}
                  variant={k.importance >= 4 || i < 4 ? "light" : "default"}
                  color={k.importance >= 4 || i < 4 ? "magenta" : "gray"}
                  size="sm"
                  className="mono"
                >
                  {k.keyword}
                </Badge>
              ))}
            </Group>
          )}
        </>
      )}
    </Card>
  );
}
