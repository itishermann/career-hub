"use client";

import { Badge } from "@mantine/core";
import {
  BookOpen,
  Briefcase,
  FileText,
  Folder,
  LayoutDashboard,
  ListChecks,
  Settings,
  Sparkles,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useJobs } from "@/components/jobs/JobsProvider";
import { Link, usePathname } from "@/i18n/navigation";
import styles from "./Sidebar.module.css";

type CurrentUserLite = {
  name: string | null;
  email: string;
};

type NavItem = {
  key:
    | "dashboard"
    | "profile"
    | "journal"
    | "campaigns"
    | "generations"
    | "templates"
    | "tasks";
  href: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const NAV_ITEMS: readonly NavItem[] = [
  { key: "dashboard", href: "/", icon: LayoutDashboard, exact: true },
  { key: "profile", href: "/profile", icon: User },
  { key: "journal", href: "/journal", icon: BookOpen },
  { key: "campaigns", href: "/campaigns", icon: Briefcase },
  { key: "generations", href: "/generations", icon: FileText },
  { key: "tasks", href: "/tasks", icon: ListChecks },
  { key: "templates", href: "/templates", icon: Folder },
] as const;

export function Sidebar({ currentUser }: { currentUser: CurrentUserLite }) {
  const t = useTranslations("nav");
  const tApp = useTranslations("app");
  const pathname = usePathname();
  const { activeCount } = useJobs();

  const initials = getInitials(currentUser.name ?? currentUser.email);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandBadge}>
          <Sparkles size={14} strokeWidth={2.4} />
        </span>
        <span className={styles.brandName}>{tApp("name")}</span>
      </div>

      <nav className={styles.navSection}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={styles.navItem}
              data-active={isActive}
            >
              <Icon size={15} strokeWidth={2} aria-hidden />
              <span style={{ flex: 1 }}>{t(item.key)}</span>
              {item.key === "tasks" && activeCount > 0 && (
                <Badge size="xs" circle color="magenta" ml="auto">
                  {activeCount}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <Link
          href="/settings"
          className={styles.navItem}
          data-active={pathname.startsWith("/settings")}
        >
          <Settings size={15} strokeWidth={2} aria-hidden />
          <span>{t("settings")}</span>
        </Link>
        <div className={styles.userRow}>
          <span className={styles.avatar}>{initials}</span>
          <div className={styles.userMeta}>
            <div className={styles.userName}>
              {currentUser.name ?? currentUser.email}
            </div>
            <div className={styles.userEmail}>{currentUser.email}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function getInitials(value: string): string {
  return value
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
