/**
 * Single funnel for operational errors.
 *
 * `reportError` logs the error as structured JSON (via Pino) AND forwards it to
 * every registered reporter. This is the seam for an external tracker: plug
 * Sentry (or any other) in with one line at boot in `instrumentation.ts`:
 *
 *   import * as Sentry from "@sentry/node";
 *   registerErrorReporter((err, ctx) => Sentry.captureException(err, { extra: ctx }));
 *
 * Nothing else in the app needs to change when you add a tracker — all error
 * paths already call reportError().
 */

import { logger } from "@/server/logger";

export type ErrorContext = Record<string, unknown>;
export type ErrorReporter = (error: Error, context: ErrorContext) => void;

const reporters: ErrorReporter[] = [];

/** Register an external error sink (e.g. Sentry). Call once at startup. */
export function registerErrorReporter(reporter: ErrorReporter): void {
  reporters.push(reporter);
}

export function reportError(
  error: unknown,
  context: ErrorContext = {},
  message = "error",
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error({ err, ...context }, message);
  for (const report of reporters) {
    try {
      report(err, context);
    } catch (reporterErr) {
      logger.warn({ err: reporterErr }, "error reporter threw");
    }
  }
}
