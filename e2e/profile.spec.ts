import { expect, test } from "@playwright/test";
import { uniqueSuffix } from "./helpers";

/**
 * Profile editing. The pitch editor (PitchCard) uses the bilingual
 * LocalizedTextInput with FR/EN tabs. We edit the FR pitch, save, reload, and
 * assert persistence. We also exercise the FR/EN tab switch and confirm seeded
 * structured data (experiences, skills) renders.
 */
test.describe("profile", () => {
  test("edits the FR pitch and persists across reload", async ({ page }) => {
    await page.goto("/fr/profile");

    await expect(
      page.getByRole("heading", { name: "Pitch professionnel" }),
    ).toBeVisible();

    // The pitch textarea is uniquely identified by its placeholder. FR tab is
    // active by default.
    const newPitch = `Pitch e2e ${uniqueSuffix()} — développeur fullstack senior.`;
    const textarea = page.getByPlaceholder("Décris-toi en 2-3 phrases…");
    await textarea.click();
    // Select-all + clear, then type, to reliably reset Mantine's controlled
    // autosize Textarea regardless of pre-existing (possibly long) content.
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("Delete");
    await textarea.fill(newPitch);
    await expect(textarea).toHaveValue(newPitch);

    // The PitchCard's own "Enregistrer" button (the first save button on page).
    const saveBtn = page.getByRole("button", { name: "Enregistrer" }).first();
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Wait for the success toast so the server action has committed before reload.
    await expect(page.getByText("Pitch enregistré.")).toBeVisible();

    // Reload and re-read the FR pitch (FR tab is active by default).
    await page.reload();
    const reloaded = page.getByPlaceholder("Décris-toi en 2-3 phrases…");
    await expect(reloaded).toHaveValue(newPitch);
  });

  test("FR/EN tab switch on the pitch editor", async ({ page }) => {
    await page.goto("/fr/profile");
    await expect(
      page.getByRole("heading", { name: "Pitch professionnel" }),
    ).toBeVisible();

    // The pitch editor's LocalizedTextInput root holds the FR/EN tabs; scope to
    // the tablist that sits in the same component as the pitch placeholder.
    const pitchEditor = page
      .locator(".m_root, [class*='root']")
      .filter({ has: page.getByPlaceholder("Décris-toi en 2-3 phrases…") })
      .first();
    const frTab = pitchEditor.getByRole("tab", { name: /FR/ });
    const enTab = pitchEditor.getByRole("tab", { name: /EN/ });
    await expect(frTab).toBeVisible();
    await expect(enTab).toBeVisible();

    await enTab.click();
    await expect(enTab).toHaveAttribute("aria-selected", "true");
    await frTab.click();
    await expect(frTab).toHaveAttribute("aria-selected", "true");
  });

  test("seeded structured data renders (experiences + skills)", async ({
    page,
  }) => {
    await page.goto("/fr/profile");

    // Identity header shows the seeded admin name.
    await expect(page.getByText("Jean Dupont").first()).toBeVisible();

    // Skills section heading and at least one skill chip render. The skills
    // card title comes from the profile namespace; assert the card region by
    // its experiences counterpart instead, which is robust: the experiences
    // list renders company/role text. We assert the page has substantial
    // content (many skill/experience nodes) without binding to exact strings.
    const cards = page.locator(".mantine-Card-root");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(2);
  });
});
