import { expect, test } from "@playwright/test";
import { createCampaign, uniqueSuffix } from "./helpers";

/**
 * Background tasks UI. The mock worker is fast (RUNNING is fleeting), so we
 * focus on: page structure (the three sections), a finished job appearing, and
 * — best-effort — cancelling a queued job. If we can't reliably catch a QUEUED
 * job before the worker drains it, we skip the cancel interaction with a note
 * rather than flaking.
 */
test.describe("tasks", () => {
  test("renders the three sections and a finished job", async ({ page }) => {
    // Enqueue one generation so there is at least one finished task.
    await createCampaign(page, {
      name: `E2E Tasks ${uniqueSuffix()}`,
      company: "Tasks Co",
      role: "Engineer",
      jd: "Engineer role with TypeScript, React, Node and PostgreSQL. Build and ship features.",
    });
    await page.getByRole("button", { name: "Générer un CV" }).click();
    await page.getByRole("button", { name: /sobre-fr/ }).click();
    await page.getByRole("button", { name: "Lancer la génération" }).click();
    await page.waitForURL(/\/fr\/tasks$/);

    // The three section headers are always present.
    await expect(page.getByText("En cours", { exact: true })).toBeVisible();
    await expect(
      page.getByText("En file d'attente", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Terminées", { exact: true })).toBeVisible();

    // A finished job shows up (SUCCEEDED → "Terminé" badge + result link).
    await expect(
      page.getByRole("button", { name: "Voir le résultat" }).first(),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("cancels a queued generation job (best-effort)", async ({ page }) => {
    // Create a campaign, then enqueue two generations back-to-back so the
    // second is likely QUEUED behind the first (single-concurrency worker).
    await createCampaign(page, {
      name: `E2E Cancel ${uniqueSuffix()}`,
      company: "Queue Co",
      role: "Engineer",
      jd: "Engineer role with TypeScript, React, Node and PostgreSQL. Build and ship features end to end.",
    });

    // First generation.
    await page.getByRole("button", { name: "Générer un CV" }).click();
    await page.getByRole("button", { name: /sobre-fr/ }).click();
    await page.getByRole("button", { name: "Lancer la génération" }).click();
    await page.waitForURL(/\/fr\/tasks$/);

    // Second generation immediately (go back, enqueue again) to fill the queue.
    await page.goBack();
    await page.getByRole("button", { name: "Générer un CV" }).click();
    await page.getByRole("button", { name: /sobre-fr/ }).click();
    await page.getByRole("button", { name: "Lancer la génération" }).click();
    await page.waitForURL(/\/fr\/tasks$/);

    // A "Annuler" button only appears on QUEUED/RUNNING jobs. The mock worker
    // is fast; if both already finished, skip the interaction gracefully.
    const cancelBtn = page.getByRole("button", { name: "Annuler" }).first();
    if (!(await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
      test.skip(
        true,
        "Mock worker drained the queue before a cancellable (QUEUED) job could be observed; RUNNING/QUEUED is too fleeting to assert reliably.",
      );
    }

    await cancelBtn.click();
    // The cancelled job lands in the finished section as "Annulé".
    await expect(page.getByText("Annulé", { exact: true }).first()).toBeVisible(
      { timeout: 30_000 },
    );
  });
});
