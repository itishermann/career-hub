import { expect, test } from "@playwright/test";
import { uniqueSuffix } from "./helpers";

/**
 * Settings is a single consolidated tabbed page (/fr/settings); the old
 * /settings/llm, /settings/api-tokens, /settings/profile routes redirect here.
 * We exercise the LLM tab (mode toggle), the API tokens tab (create a token),
 * and the account/preferences rendering.
 */
test.describe("settings", () => {
  test("LLM tab renders the mode toggle and options", async ({ page }) => {
    await page.goto("/fr/settings/llm");
    await page.waitForURL(/\/fr\/settings$/);

    await page.getByRole("tab", { name: "Configuration LLM" }).click();

    // The mode SegmentedControl with Mock / Local / Anthropic options.
    await expect(page.getByRole("heading", { name: "Mode LLM" })).toBeVisible();
    await expect(
      page.locator("label").filter({ hasText: /^Local$/ }),
    ).toBeVisible();
    await expect(
      page.locator("label").filter({ hasText: /^Anthropic$/ }),
    ).toBeVisible();

    // Selecting Anthropic reveals its config card (API key field).
    await page
      .locator("label")
      .filter({ hasText: /^Anthropic$/ })
      .click();
    await expect(
      page.getByRole("heading", { name: "Anthropic" }),
    ).toBeVisible();
  });

  test("API tokens tab creates a token and lists it", async ({ page }) => {
    await page.goto("/fr/settings/api-tokens");
    await page.waitForURL(/\/fr\/settings$/);

    await page.getByRole("tab", { name: "Tokens API" }).click();

    const tokenName = `e2e-token-${uniqueSuffix()}`;
    await page.getByLabel("Nom").fill(tokenName);

    // Create. Default scopes are preselected (profile:read, generations:read).
    await page.getByRole("button", { name: "Créer", exact: true }).click();

    // The one-time plaintext token is shown in a success alert with a Copier
    // button. We assert the alert appears (not the secret value itself).
    await expect(
      page.getByText("Copie-le maintenant", { exact: false }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Copier" })).toBeVisible();

    // The new token appears in the list below (by its name).
    await expect(page.getByText(tokenName).first()).toBeVisible();
  });

  test("account + preferences render", async ({ page }) => {
    await page.goto("/fr/settings");

    // Account tab is the default; shows the seeded admin email + UI language.
    await expect(page.getByRole("tab", { name: "Compte" })).toBeVisible();
    await expect(page.getByText("Email").first()).toBeVisible();

    // Preferences tab renders density/theme controls.
    await page.getByRole("tab", { name: "Préférences", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Enregistrer les préférences" }),
    ).toBeVisible();
  });
});
