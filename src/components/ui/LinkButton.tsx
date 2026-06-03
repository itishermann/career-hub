"use client";

import { Button, type ButtonProps } from "@mantine/core";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { ChIcon, type ChIconName } from "./icons";

/**
 * A Mantine Button that navigates via next-intl's `Link`.
 *
 * This wrapper exists so Server Components can render a navigation button
 * without passing the `Link` component (a forwardRef object) or a lucide icon
 * across the RSC boundary — both of which are non-serializable. The server
 * passes only serializable props (href, label text, an icon *name*).
 */
type LinkButtonProps = ButtonProps & {
  href: string;
  icon?: ChIconName;
  children?: ReactNode;
};

export function LinkButton({ href, icon, children, ...rest }: LinkButtonProps) {
  return (
    <Button
      component={Link}
      href={href}
      leftSection={icon ? <ChIcon name={icon} size={14} /> : undefined}
      {...rest}
    >
      {children}
    </Button>
  );
}
