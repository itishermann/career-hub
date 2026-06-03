import type { ReactNode } from "react";
import { JobsProvider } from "@/components/jobs/JobsProvider";
import type { CurrentUser } from "@/server/auth-helpers";
import styles from "./AppShell.module.css";
import { BreadcrumbProvider } from "./BreadcrumbContext";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function AppShell({
  currentUser,
  children,
}: {
  currentUser: CurrentUser;
  children: ReactNode;
}) {
  return (
    <JobsProvider>
      <BreadcrumbProvider>
        <div className={styles.root}>
          <Sidebar
            currentUser={{ name: currentUser.name, email: currentUser.email }}
          />
          <div className={styles.main}>
            <Header devMode={currentUser.isDev} />
            <div className={styles.scroll}>{children}</div>
          </div>
        </div>
      </BreadcrumbProvider>
    </JobsProvider>
  );
}
