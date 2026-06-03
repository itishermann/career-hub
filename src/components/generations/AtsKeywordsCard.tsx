"use client";

import { Badge, Card, Group, Stack, Text, Title } from "@mantine/core";

type Kw = {
  keyword: string;
  count?: number;
  importance?: number;
  category?: string;
};

export function AtsKeywordsCard({
  matched,
  missing,
}: {
  matched: Kw[];
  missing: Kw[];
}) {
  if (matched.length === 0 && missing.length === 0) return null;
  return (
    <Card>
      <Title order={3} mb="sm">
        Mots-clés ATS
      </Title>
      {matched.length > 0 && (
        <Stack gap={6} mb={missing.length > 0 ? "md" : 0}>
          <Text
            size="xs"
            tt="uppercase"
            c="dimmed"
            fw={500}
            style={{ letterSpacing: "0.06em" }}
          >
            Matched · {matched.length}
          </Text>
          <Group gap={5} wrap="wrap">
            {matched.map((k) => (
              <Badge
                key={k.keyword}
                variant="light"
                color="green"
                size="sm"
                className="mono"
              >
                {k.keyword}
                {k.count ? (
                  <span style={{ opacity: 0.6, marginLeft: 3 }}>
                    ×{k.count}
                  </span>
                ) : null}
              </Badge>
            ))}
          </Group>
        </Stack>
      )}
      {missing.length > 0 && (
        <Stack gap={6}>
          <Text
            size="xs"
            tt="uppercase"
            c="dimmed"
            fw={500}
            style={{ letterSpacing: "0.06em" }}
          >
            Missing · {missing.length}
          </Text>
          <Group gap={5} wrap="wrap">
            {missing.map((k) => (
              <Badge
                key={k.keyword}
                variant="light"
                color="red"
                size="sm"
                className="mono"
              >
                {k.keyword}
              </Badge>
            ))}
          </Group>
        </Stack>
      )}
    </Card>
  );
}
