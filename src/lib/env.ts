import { z } from "zod";

const DEV_DEFAULT_SECRET = "dev-secret-replace-me-with-at-least-32-chars-of-padding";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1).default("postgres://career:dev-password@localhost:5432/career_hub"),

  // Auth — defaults are dev-only. Production guards run after parse.
  AUTH_ENABLED: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .default("false")
    .transform((v) => (typeof v === "boolean" ? v : v === "true")),
  BETTER_AUTH_SECRET: z
    .string()
    .min(16, "BETTER_AUTH_SECRET must be at least 16 chars")
    .default(DEV_DEFAULT_SECRET),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  TRUSTED_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean)),

  // SMTP
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z
    .string()
    .default("1025")
    .transform((v) => Number.parseInt(v, 10)),
  SMTP_SECURE: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .default("false")
    .transform((v) => (typeof v === "boolean" ? v : v === "true")),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASSWORD: z.string().optional().default(""),
  SMTP_FROM: z.string().default("career-hub <dev@localhost>"),

  // i18n
  DEFAULT_LOCALE: z.enum(["fr", "en"]).default("fr"),

  // Seed / Bootstrap
  SEED_PERSONALITY_FILE: z.string().optional().default("./Perosnality.md"),
  BOOTSTRAP_ADMIN_EMAIL: z.string().email().default("jean.dupont@example.com"),

  // Storage
  STORAGE_PATH: z.string().default("./storage"),

  // LLM defaults
  DEFAULT_LLM_MODE: z.enum(["local", "anthropic", "mock"]).default("mock"),

  // Background jobs
  JOB_MAX_ATTEMPTS: z
    .string()
    .default("2")
    .transform((v) => Number.parseInt(v, 10)),
  JOB_POLL_INTERVAL_MS: z
    .string()
    .default("2000")
    .transform((v) => Number.parseInt(v, 10)),

  // Runtime
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.flatten();
    console.error("Invalid environment variables:", formatted.fieldErrors);
    if (process.env.NODE_ENV === "production") {
      throw new Error("Invalid environment configuration");
    }
    return envSchema.parse({});
  }
  return parsed.data;
}

export const env: Env = parseEnv();

// Production hard-fails — dev-only convenience must NOT silently survive when
// the app is actually *serving* in production. We skip the guard during the
// `next build` phase (NEXT_PHASE === "phase-production-build") because the
// build can run before the real env is provided (e.g. CI builds containers).
const NEXT_PHASE = process.env.NEXT_PHASE;
const isBuildPhase = NEXT_PHASE === "phase-production-build";

if (env.NODE_ENV === "production" && !isBuildPhase) {
  const errors: string[] = [];
  if (!env.AUTH_ENABLED) {
    errors.push("AUTH_ENABLED=false is forbidden in production");
  }
  if (env.BETTER_AUTH_SECRET === DEV_DEFAULT_SECRET) {
    errors.push("BETTER_AUTH_SECRET is the dev default — replace with a real secret");
  }
  if (errors.length > 0) {
    throw new Error(`[env] production guard failed:\n  - ${errors.join("\n  - ")}`);
  }
}

export const isDev = env.NODE_ENV === "development";
export const isProd = env.NODE_ENV === "production";
