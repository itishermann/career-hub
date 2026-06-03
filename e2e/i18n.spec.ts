import { expect, test } from "@playwright/test";

/**
 * Language switching via the header SegmentedControl (FR/EN). Asserts both the
 * URL locale prefix flips and a known UI string changes.
 */
test.describe("i18n", () => {
  test("switches FR → EN and back via the header switcher", async ({
    page,
  }) => {
    await page.goto("/fr/tasks");

    // FR baseline: nav + page title in French.
    await expect(page.getByRole("link", { name: "Profil" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Tâches en arrière-plan" }),
    ).toBeVisible();

    // The header language switcher is a Mantine SegmentedControl with FR/EN.
    // The radio <input> is visually hidden, so click its label.
    await page.locator("label").filter({ hasText: /^EN$/ }).click();

    await page.waitForURL(/\/en\/tasks$/);
    await expect(
      page.getByRole("heading", { name: "Background tasks" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Profile", exact: true }),
    ).toBeVisible();
    // French-only label gone (exact match so it doesn't match "Profile").
    await expect(
      page.getByRole("link", { name: "Profil", exact: true }),
    ).toHaveCount(0);

    // Switch back to FR.
    await page.locator("label").filter({ hasText: /^FR$/ }).click();
    await page.waitForURL(/\/fr\/tasks$/);
    await expect(
      page.getByRole("heading", { name: "Tâches en arrière-plan" }),
    ).toBeVisible();
  });

  test("English dashboard renders", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByRole("link", { name: "Profile" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Campaigns" })).toBeVisible();
    // Dashboard greeting ("Hello {name}") differs from FR ("Bonjour {name}").
    await expect(page.getByRole("heading", { name: /Hello/ })).toBeVisible();
  });
});
