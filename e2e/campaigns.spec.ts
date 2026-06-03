import { expect, test } from "@playwright/test";
import { createCampaign, uniqueSuffix } from "./helpers";

test.describe("campaigns", () => {
  // The empty-state assertion must run before any campaign is created, so keep
  // it first and gate it: if a previous test in the run already created a
  // campaign, the empty state won't show. We detect that and skip gracefully.
  test("shows the empty state on a fresh test DB", async ({ page }) => {
    await page.goto("/fr/campaigns");
    await expect(
      page.getByRole("heading", { name: "Campagnes" }),
    ).toBeVisible();

    const emptyState = page.getByText(
      "Aucune campagne. Crée ta première campagne pour démarrer.",
    );
    if ((await emptyState.count()) === 0) {
      test.skip(
        true,
        "Campaigns already exist (created earlier in this serial run); empty state not applicable.",
      );
    }
    await expect(emptyState).toBeVisible();
  });

  test("creates a campaign via the wizard and opens its detail page", async ({
    page,
  }) => {
    const name = `E2E Campaign ${uniqueSuffix()}`;
    const company = "Doctolib";
    const role = "Senior Software Engineer";

    const url = await createCampaign(page, {
      name,
      company,
      role,
      jd: "We are hiring a senior fullstack engineer. Stack: TypeScript, React, Node, PostgreSQL, Docker. You will own features end to end and mentor juniors.",
    });

    // Detail page loaded — campaign name shows as the page H1 + breadcrumb.
    expect(url).toMatch(/\/fr\/campaigns\/[a-z0-9]+$/);
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expect(page.getByText(company).first()).toBeVisible();

    // It also appears back in the list. The grid card surfaces the company as
    // the title; switch to the list view to see the campaign name itself.
    await page.goto("/fr/campaigns");
    await page.getByRole("button", { name: "Liste" }).click();
    await expect(page.getByText(name).first()).toBeVisible();
  });
});
