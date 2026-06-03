import { defineConfig, devices } from "@playwright/test";

// E2E runs against the ephemeral db-e2e container (see docker-compose.e2e.yml),
// with auth disabled and the LLM forced to deterministic mock responses. The
// app is served on a dedicated port so it never clashes with a dev server.
const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgres://career:e2e_password@localhost:15433/career_hub";
const PORT = Number.parseInt(process.env.E2E_PORT ?? "3100", 10);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Tests share one seeded DB + a single-concurrency job worker, so run serially
  // for determinism.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 12_000 },
  reporter: process.env.CI
    ? [
        ["list"],
        ["html", { open: "never" }],
        ["junit", { outputFile: "playwright-report/junit.xml" }],
      ]
    : [["list"]],
  use: {
    baseURL: BASE_URL,
    locale: "fr-FR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `bun run dev --port ${PORT} --hostname 127.0.0.1`,
    url: `${BASE_URL}/api/health`,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      AUTH_ENABLED: "false",
      LLM_FORCE_MOCK: "true",
      DEFAULT_LOCALE: "fr",
      NODE_ENV: "development",
      JOB_POLL_INTERVAL_MS: "500",
    },
  },
});
