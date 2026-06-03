import { headers } from "next/headers";
import { env } from "@/lib/env";
import { auth } from "@/server/auth";
import { db } from "@/server/db";

// In AUTH_ENABLED=false dev mode, we sign the bootstrap admin in by default so
// the developer sees the seeded profile data instead of an empty account.
// Override via DEV_USER_EMAIL env if you want to test as a different user.
const DEV_USER_EMAIL = process.env.DEV_USER_EMAIL ?? env.BOOTSTRAP_ADMIN_EMAIL;

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
  uiLocale: string;
  onboardingCompleted: boolean;
  llmConfig: unknown;
  isDev: boolean;
};

/**
 * Centralised user resolver. If AUTH_ENABLED=false, returns/creates a deterministic
 * dev user so the rest of the app can run without auth. Otherwise resolves the
 * Better Auth session and looks up the user.
 *
 * Returns null if no authenticated user (in auth-enabled mode).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!env.AUTH_ENABLED) {
    return getOrCreateDevUser();
  }

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return null;
    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      uiLocale: user.uiLocale,
      onboardingCompleted: user.onboardingCompleted,
      llmConfig: user.llmConfig,
      isDev: false,
    };
  } catch (err) {
    console.error("[auth] getCurrentUser failed:", err);
    return null;
  }
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return user;
}

async function getOrCreateDevUser(): Promise<CurrentUser> {
  if (env.NODE_ENV !== "development") {
    throw new Error("dev user fallback is dev-only — refuse to mint ADMIN outside development");
  }
  try {
    const existing = await db.user.findUnique({ where: { email: DEV_USER_EMAIL } });
    if (existing) {
      return {
        id: existing.id,
        email: existing.email,
        name: existing.name,
        role: existing.role,
        uiLocale: existing.uiLocale,
        onboardingCompleted: existing.onboardingCompleted,
        llmConfig: existing.llmConfig,
        isDev: true,
      };
    }
    const created = await db.user.create({
      data: {
        email: DEV_USER_EMAIL,
        name: DEV_USER_EMAIL === env.BOOTSTRAP_ADMIN_EMAIL ? "Jean Dupont" : "Dev User",
        role: "ADMIN",
        uiLocale: env.DEFAULT_LOCALE,
        onboardingCompleted: true,
        llmConfig: { mode: env.DEFAULT_LLM_MODE },
      },
    });
    return {
      id: created.id,
      email: created.email,
      name: created.name,
      role: created.role,
      uiLocale: created.uiLocale,
      onboardingCompleted: created.onboardingCompleted,
      llmConfig: created.llmConfig,
      isDev: true,
    };
  } catch (err) {
    // DB unreachable in dev — return a stub so the UI can still render
    // (e.g. show a "db down" empty state). This is dev-only because of the
    // NODE_ENV guard above; the stub never reaches production.
    console.warn("[auth] dev user fallback (DB unreachable, dev mode):", err);
    return {
      id: "dev-user-stub",
      email: DEV_USER_EMAIL,
      name: "Dev User (stub)",
      role: "ADMIN",
      uiLocale: env.DEFAULT_LOCALE,
      onboardingCompleted: true,
      llmConfig: { mode: env.DEFAULT_LLM_MODE },
      isDev: true,
    };
  }
}
