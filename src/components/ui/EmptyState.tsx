"use client";

import { Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";
import { ChIcon, type ChIconName } from "./icons";

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  // String key (not the lucide component) so this can be called from Server
  // Components without crossing the RSC serialization boundary. See ./icons.
  icon: ChIconName;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <Stack
      align="center"
      gap="xs"
      py="xl"
      style={{ padding: "60px 24px", textAlign: "center" }}
    >
      <ChIcon name={icon} size={32} color="var(--ch-fg-3)" />
      <Title order={3} mt="sm">
        {title}
      </Title>
      {hint && (
        <Text c="dimmed" size="sm" maw={420}>
          {hint}
        </Text>
      )}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </Stack>
  );
}
