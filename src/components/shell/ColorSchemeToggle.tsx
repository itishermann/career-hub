"use client";

import { ActionIcon, useMantineColorScheme } from "@mantine/core";
import { Moon, Sun } from "lucide-react";

export function ColorSchemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme({
    keepTransitions: true,
  });
  const dark = colorScheme === "dark";

  return (
    <ActionIcon
      variant="default"
      onClick={() => setColorScheme(dark ? "light" : "dark")}
      aria-label="Toggle color scheme"
      size="lg"
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </ActionIcon>
  );
}
