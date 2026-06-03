import { expect, test } from "@playwright/test";
import { uniqueSuffix } from "./helpers";

/**
 * Journal: add an entry and assert it appears in the anti-chronological list.
 * Adding an entry enqueues a fact-extraction job via the event system, but the
 * mock extraction is fast and timing-dependent, so we don't assert on the job.
 */
test.describe("journal", () => {
  test("adds an entry and it appears in the list", async ({ page }) => {
    await page.goto("/fr/journal");

    const content = `Entrée e2e ${uniqueSuffix()} : j'ai mené une migration Next.js 16 en production.`;

    const textarea = page.getByPlaceholder(
      "Une pensée, une réflexion, un retex…",
    );
    await expect(textarea).toBeVisible();
    await textarea.fill(content);

    // The add button (Mantine, label from actions.add = "Ajouter").
    await page.getByRole("button", { name: "Ajouter" }).click();

    // The optimistic update prepends the entry; assert it renders.
    await expect(page.getByText(content)).toBeVisible();

    // Reload to confirm it persisted server-side.
    await page.reload();
    await expect(page.getByText(content)).toBeVisible();
  });
});
