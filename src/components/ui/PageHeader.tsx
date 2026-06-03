"use client";

import { Group, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <Group justify="space-between" align="flex-start" mb="lg">
      <Stack gap={4}>
        <Title order={1} style={{ fontSize: 24 }}>
          {title}
        </Title>
        {subtitle && <Text c="dimmed">{subtitle}</Text>}
      </Stack>
      {right}
    </Group>
  );
}
