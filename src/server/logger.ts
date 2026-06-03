/**
 * Structured application logger (Pino).
 *
 * Emits JSON lines (level, time, scope, fields) — ready to ship to Sentry, Loki,
 * Datadog, etc. In dev, pipe through pino-pretty for readability:
 *   bun run dev | bunx pino-pretty
 *
 * Sensitive fields (API keys, tokens, passwords) are redacted automatically.
 */

import pino from "pino";
import { env } from "@/lib/env";

const level =
  process.env.LOG_LEVEL ?? (env.NODE_ENV === "production" ? "info" : "debug");

export const logger = pino({
  level,
  base: { service: "career-hub" },
  redact: {
    paths: [
      "apiKey",
      "password",
      "token",
      "*.apiKey",
      "*.password",
      "*.token",
      "*.oauthToken",
      "config.anthropic.apiKey",
      "config.local.apiKey",
      "config.embeddings.apiKey",
      "llmConfig.anthropic.apiKey",
      "llmConfig.local.apiKey",
      "llmConfig.embeddings.apiKey",
    ],
    censor: "[redacted]",
  },
});

/** A child logger bound to a scope, e.g. loggerFor("jobs"). */
export function loggerFor(scope: string): pino.Logger {
  return logger.child({ scope });
}
