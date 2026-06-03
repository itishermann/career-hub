import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { redirect } from "@/i18n/navigation";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/server/auth-helpers";

// The entire (app) area depends on the authenticated user and must therefore
// be server-rendered on demand. Without this, Next would try to statically
// prerender pages like /campaigns/new and hit the auth fallback at build time.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect({ href: "/login", locale });
  }

  // Onboarding gate (enforced from phase 2; user.onboardingCompleted may be false).
  if (user && !user.onboardingCompleted) {
    redirect({ href: "/onboarding", locale });
  }

  return <AppShell currentUser={user!}>{children}</AppShell>;
}
