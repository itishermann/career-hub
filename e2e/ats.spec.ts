import { expect, test } from "@playwright/test";
import { createCampaign, gotoApp, uniqueSuffix } from "./helpers";

test.describe("ATS scoring", () => {
  test("scores a generation and surfaces the result", async ({ page }) => {
    // 1. Campaign with a JD (keyword extraction needs one), then a CV.
    const name = `E2E ATS ${uniqueSuffix()}`;
    await createCampaign(page, {
      name,
      jd: "Senior fullstack engineer. Required: TypeScript, React, Node.js, PostgreSQL, Docker, CI/CD. Strong testing culture and ownership.",
    });
    // createCampaign leaves us on the campaign detail page.
    await page.getByRole("button", { name: "Générer un CV" }).click();
    await page.getByRole("button", { name: /sobre-fr/ }).click();
    await page.getByRole("button", { name: "Lancer la génération" }).click();
    await page.waitForURL(/\/fr\/tasks$/);
    await expect(
      page.getByText("Terminé", { exact: true }).first(),
    ).toBeVisible({ timeout: 30_000 });

    // 2. Open the generation detail via the "Voir le résultat" link.
    await page
      .getByRole("button", { name: "Voir le résultat" })
      .first()
      .click();
    await page.waitForURL(/\/fr\/generations\/[a-z0-9]+$/);
    const genUrl = page.url();
    await expect(page.getByText("Pas encore scoré")).toBeVisible();

    // 3. Trigger ATS scoring (enqueues an ATS_SCORING job).
    await page.getByRole("button", { name: /Scorer ATS/i }).click();

    // 4. The ATS job runs on /tasks.
    await gotoApp(page, "/fr/tasks");
    await expect(page.getByText("Scoring ATS").first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByText("Terminé", { exact: true }).first(),
    ).toBeVisible({ timeout: 30_000 });

    // 5. Reload the generation detail; the score is now persisted → the ATS
    // score card (heading "Score ATS" + breakdown bars) replaces the empty state.
    await page.goto(genUrl);
    await expect(page.getByText("Pas encore scoré")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Score ATS" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Analyse contextuelle")).toBeVisible();
  });
});
