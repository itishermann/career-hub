"use client";

import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import type { ReactNode } from "react";
import { resolver, theme } from "./theme";

/**
 * Client wrapper holding MantineProvider + Modals + Notifications.
 * Lives in a client component because the CSS variables resolver and modal
 * portals cannot cross the server/client boundary.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <MantineProvider theme={theme} cssVariablesResolver={resolver} defaultColorScheme="dark">
      <ModalsProvider>
        <Notifications position="bottom-right" />
        {children}
      </ModalsProvider>
    </MantineProvider>
  );
}
