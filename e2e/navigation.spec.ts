import { expect, test } from "@playwright/test";

/**
 * Visit every app route and assert it renders the authenticated shell (sidebar)
 * plus a route-specific element, with no Next.js error boundary. The
 * /fr/settings/* sub-routes are server-redirects to the consolidated
 * /fr/settings tabbed page, so we assert the final settled URL.
 */

type RouteCheck = {
  path: string;
  finalUrl?: RegExp;
  assert: (page: import("@playwright/test").Page) => Promise<void>;
};

const ROUTES: RouteCheck[] = [
  {
    path: "/fr",
    assert: async (page) => {
      await expect(
        page.getByRole("heading", { name: /Bonjour/ }),
      ).toBeVisible();
    },
  },
  {
    path: "/fr/profile",
    assert: async (page) => {
      await expect(
        page.getByRole("heading", { name: "Pitch professionnel" }),
      ).toBeVisible();
    },
  },
  {
    path: "/fr/journal",
    assert: async (page) => {
      await expect(
        page.getByRole("heading", { name: "Journal" }).first(),
      ).toBeVisible();
      await expect(page.getByText("Ajouter une entrée").first()).toBeVisible();
    },
  },
  {
    path: "/fr/campaigns",
    assert: async (page) => {
      await expect(
        page.getByRole("heading", { name: "Campagnes" }),
      ).toBeVisible();
    },
  },
  {
    path: "/fr/generations",
    assert: async (page) => {
      await expect(
        page.getByRole("heading", { name: "Générations" }),
      ).toBeVisible();
    },
  },
  {
    path: "/fr/templates",
    assert: async (page) => {
      await expect(
        page.getByRole("heading", { name: "Templates" }),
      ).toBeVisible();
    },
  },
  {
    path: "/fr/tasks",
    assert: async (page) => {
      await expect(
        page.getByRole("heading", { name: "Tâches en arrière-plan" }),
      ).toBeVisible();
    },
  },
  {
    path: "/fr/settings",
    assert: async (page) => {
      await expect(
        page.getByRole("heading", { name: "Paramètres" }),
      ).toBeVisible();
      await expect(page.getByRole("tab", { name: "Compte" })).toBeVisible();
    },
  },
  {
    path: "/fr/settings/llm",
    finalUrl: /\/fr\/settings$/,
    assert: async (page) => {
      await expect(
        page.getByRole("heading", { name: "Paramètres" }),
      ).toBeVisible();
    },
  },
  {
    path: "/fr/settings/api-tokens",
    finalUrl: /\/fr\/settings$/,
    assert: async (page) => {
      await expect(
        page.getByRole("heading", { name: "Paramètres" }),
      ).toBeVisible();
    },
  },
  {
    path: "/fr/settings/profile",
    finalUrl: /\/fr\/settings$/,
    assert: async (page) => {
      await expect(
        page.getByRole("heading", { name: "Paramètres" }),
      ).toBeVisible();
    },
  },
];

test.describe("navigation", () => {
  for (const route of ROUTES) {
    test(`renders ${route.path}`, async ({ page }) => {
      await page.goto(route.path);

      if (route.finalUrl) {
        await page.waitForURL(route.finalUrl);
      }

      // Sidebar nav present on every authenticated page.
      await expect(page.getByRole("link", { name: "Profil" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Campagnes" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Tâches" })).toBeVisible();

      // No Next.js error boundary rendered.
      await expect(
        page.getByText("Application error", { exact: false }),
      ).toHaveCount(0);

      await route.assert(page);
    });
  }
});
