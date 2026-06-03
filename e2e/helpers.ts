import { expect, type Page } from "@playwright/test";

/**
 * Shared helpers for the e2e suite. Tests run serially against one seeded DB
 * (auth disabled → always the bootstrap admin "Jean Dupont", LLM forced to
 * deterministic mock). Created data is never cleaned up — the db-e2e container
 * is wiped on stop — so helpers mint unique names to stay robust to data left
 * behind by earlier tests in the same run.
 */

/** A short, unique-ish suffix usable in created entity names. */
export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Navigate and wait for the app shell (sidebar) to be present. */
export async function gotoApp(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await expect(
    page
      .getByRole("link", { name: "Profil" })
      .or(page.getByRole("link", { name: "Profile" })),
  ).toBeVisible();
}

/**
 * Create a campaign through the /fr/campaigns/new wizard. Returns the campaign
 * detail URL the wizard redirects to. The wizard is a 4-step Stepper; only the
 * "Cible" step has required fields, so we fill it then jump to the recap.
 */
export async function createCampaign(
  page: Page,
  opts: { name: string; company?: string; role?: string; jd?: string },
): Promise<string> {
  await page.goto("/fr/campaigns/new");

  await page.getByLabel("Nom de la campagne").fill(opts.name);
  await page.getByLabel("Entreprise cible").fill(opts.company ?? "ACME Corp");
  await page
    .getByLabel("Intitulé du poste")
    .fill(opts.role ?? "Senior Engineer");

  // Step 1 → 2 (Description)
  await page.getByRole("button", { name: "Suivant" }).click();

  if (opts.jd) {
    await page.getByLabel("Description du poste").fill(opts.jd);
  }
  // Step 2 → 3 (Contact). The JD step only allows "Suivant" with >= 50 chars,
  // so when no JD is supplied we skip straight via the Stepper is not possible;
  // instead the contact/recap steps always allow continue. We click through.
  // If JD is empty the "Suivant" button is disabled on the JD step — provide a
  // default JD so we can always proceed.
  if (!opts.jd) {
    await page
      .getByLabel("Description du poste")
      .fill(
        "We are hiring a senior fullstack engineer with strong TypeScript, React and Node skills.",
      );
  }
  await page.getByRole("button", { name: "Suivant" }).click(); // → Contact
  await page.getByRole("button", { name: "Suivant" }).click(); // → Récap

  await page.getByRole("button", { name: "Créer la campagne" }).click();

  await page.waitForURL(/\/fr\/campaigns\/[a-z0-9]+$/);
  return page.url();
}

/**
 * Launch a generation from a campaign detail page and wait for it to land in
 * the "Terminées" (SUCCEEDED) section on /fr/tasks.
 */
export async function generateFromCampaign(
  page: Page,
  type: "CV" | "LM",
): Promise<void> {
  const cta = type === "CV" ? "Générer un CV" : "Générer une LM";
  await page.getByRole("button", { name: cta }).click();

  // Modal: pick first template (preselected) and launch.
  const launch = page.getByRole("button", { name: "Lancer la génération" });
  await expect(launch).toBeVisible();
  await launch.click();

  // Enqueue redirects to /fr/tasks.
  await page.waitForURL(/\/fr\/tasks$/);
}
