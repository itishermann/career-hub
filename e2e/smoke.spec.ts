import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("health endpoint reports ok + db up", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.db.ok).toBe(true);
  });

  test("dashboard renders the app shell (auth disabled, seeded user)", async ({
    page,
  }) => {
    await page.goto("/fr");
    // Brand + sidebar nav prove the authenticated (app) layout rendered.
    await expect(page.getByText("career-hub").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Profil" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Campagnes" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Tâches" })).toBeVisible();
  });
});
