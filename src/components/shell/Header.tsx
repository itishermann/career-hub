"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { useBreadcrumbLabel } from "./BreadcrumbContext";
import { ColorSchemeToggle } from "./ColorSchemeToggle";
import styles from "./Header.module.css";
import { LanguageSwitcher } from "./LanguageSwitcher";

const ROUTE_LABELS: Record<string, string> = {
  "/": "dashboard",
  "/profile": "profile",
  "/journal": "journal",
  "/campaigns": "campaigns",
  "/generations": "generations",
  "/tasks": "tasks",
  "/templates": "templates",
  "/settings": "settings",
  "/settings/llm": "settings",
  "/settings/api-tokens": "settings",
  "/settings/profile": "settings",
};

export function Header({ devMode }: { devMode: boolean }) {
  const pathname = usePathname();
  const tNav = useTranslations("nav");
  const tAuth = useTranslations("auth");
  // Human-readable label for the current detail page's dynamic segment
  // (e.g. a campaign name), registered by the page via <SetBreadcrumbLabel/>.
  const dynLabel = useBreadcrumbLabel();

  const segments = pathname.split("/").filter(Boolean);
  const crumbs =
    segments.length === 0
      ? [{ href: "/", label: tNav("dashboard"), current: true }]
      : segments.map((segment, i) => {
          const href = `/${segments.slice(0, i + 1).join("/")}`;
          const key = ROUTE_LABELS[href];
          const isLast = i === segments.length - 1;
          // Known route → translated label; otherwise it's a dynamic segment:
          // prefer the page-registered name for the last crumb, else the raw
          // segment.
          const label = key
            ? tNav(key as Parameters<typeof tNav>[0])
            : isLast && dynLabel
              ? dynLabel
              : segment;
          return { href, label, current: isLast };
        });

  return (
    <header className={styles.header}>
      <nav className={styles.breadcrumb} aria-label="breadcrumb">
        {crumbs.map((c, i) => (
          <span
            key={c.href}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {i > 0 && <ChevronRight size={12} aria-hidden />}
            <span data-current={c.current ? "true" : undefined}>{c.label}</span>
          </span>
        ))}
      </nav>
      <div className={styles.right}>
        {devMode && <span className={styles.devBadge}>{tAuth("devMode")}</span>}
        <LanguageSwitcher />
        <ColorSchemeToggle />
      </div>
    </header>
  );
}
