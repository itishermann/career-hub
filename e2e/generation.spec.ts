import { expect, test } from "@playwright/test";
import { createCampaign, uniqueSuffix } from "./helpers";

/**
 * The key flow: create a campaign, generate a CV (mock LLM is deterministic),
 * wait for the background job to reach SUCCEEDED on /fr/tasks, then assert the
 * generation shows in /fr/generations and its detail page renders.
 */
test.describe("generation", () => {
  test("generates a CV end to end (job → generation → detail)", async ({
    page,
  }) => {
    const name = `E2E CV ${uniqueSuffix()}`;
    await createCampaign(page, {
      name,
      company: "ACME Health",
      role: "Senior Fullstack Engineer",
      jd: "Senior fullstack engineer. TypeScript, React, Node, PostgreSQL, Docker, CI/CD. Health domain a plus.",
    });

    // On the campaign detail page → open the CV generate modal.
    await page.getByRole("button", { name: "Générer un CV" }).click();

    // Pick the sobre-fr template explicitly (it's a button in the modal).
    await page.getByRole("button", { name: /sobre-fr/ }).click();
    await page.getByRole("button", { name: "Lancer la génération" }).click();

    // Enqueue redirects to /fr/tasks.
    await page.waitForURL(/\/fr\/tasks$/);
    await expect(
      page.getByRole("heading", { name: "Tâches en arrière-plan" }),
    ).toBeVisible();

    // Wait for a job to reach the SUCCEEDED state ("Terminé" badge). The mock
    // LLM is fast; allow up to 30s for the worker + Typst compile.
    await expect(
      page.getByText("Terminé", { exact: true }).first(),
    ).toBeVisible({
      timeout: 30_000,
    });

    // A "Voir le résultat" link appears on the succeeded CV job.
    const viewResult = page
      .getByRole("button", { name: "Voir le résultat" })
      .first();
    await expect(viewResult).toBeVisible({ timeout: 30_000 });

    // The generation appears in the history list.
    await page.goto("/fr/generations");
    await expect(
      page.getByRole("heading", { name: "Générations" }),
    ).toBeVisible();
    // At least one generation row with the sobre-fr template name.
    const cvRow = page.getByText("sobre-fr").first();
    await expect(cvRow).toBeVisible();

    // Open the generation detail page → inspector tabs render.
    await cvRow.click();
    await page.waitForURL(/\/fr\/generations\/[a-z0-9]+$/);
    await expect(page.getByRole("tab", { name: "Aperçu" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Code Typst" })).toBeVisible();

    // The Typst code tab shows the generated source (Mantine Code block).
    await page.getByRole("tab", { name: "Code Typst" }).click();
    const codePanel = page.getByRole("tabpanel");
    await expect(codePanel).toBeVisible();
    // The generated Typst is non-empty.
    await expect(codePanel).not.toBeEmpty();
  });

  test("generates a cover letter (classique-fr) end to end", async ({
    page,
  }) => {
    const name = `E2E LM ${uniqueSuffix()}`;
    await createCampaign(page, {
      name,
      company: "Beta Labs",
      role: "Lead Engineer",
      jd: "Lead engineer role. Leadership, architecture, TypeScript, mentoring. French team.",
    });

    await page.getByRole("button", { name: "Générer une LM" }).click();
    await page.getByRole("button", { name: /classique-fr/ }).click();
    await page.getByRole("button", { name: "Lancer la génération" }).click();

    await page.waitForURL(/\/fr\/tasks$/);

    // Wait for a succeeded job. Multiple finished jobs may exist from the CV
    // test; we only need at least one "Terminé" + a result link.
    await expect(
      page.getByRole("button", { name: "Voir le résultat" }).first(),
    ).toBeVisible({ timeout: 30_000 });

    // The cover letter generation shows in the list (type badge "COVER_LETTER"
    // is rendered as the template "classique-fr" row).
    await page.goto("/fr/generations");
    await expect(page.getByText("classique-fr").first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
