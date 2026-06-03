"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth-helpers";
import { db } from "@/server/db";
import { LlmConfigSchema } from "@/server/llm/client";

export async function updateLlmConfig(raw: unknown) {
  const user = await requireUser();
  const config = LlmConfigSchema.parse(raw);
  await db.user.update({
    where: { id: user.id },
    data: { llmConfig: config as object },
  });
  revalidatePath("/settings/llm");
}

const UpdateUiPrefsInput = z.object({
  uiLocale: z.enum(["fr", "en"]).optional(),
  density: z.enum(["dense", "comfortable"]).optional(),
  colorScheme: z.enum(["light", "dark", "auto"]).optional(),
});

export async function updateUiPreferences(
  raw: z.infer<typeof UpdateUiPrefsInput>,
) {
  const user = await requireUser();
  const data = UpdateUiPrefsInput.parse(raw);
  await db.user.update({
    where: { id: user.id },
    data: {
      uiLocale: data.uiLocale,
      density: data.density,
      colorScheme: data.colorScheme,
    },
  });
  revalidatePath("/settings");
}

/**
 * Re-run the onboarding wizard from /settings. Flips onboardingCompleted back
 * to false and redirects into the wizard. Data is untouched — only the config
 * flow is replayed (per spec, the wizard is "rejouable").
 */
export async function restartOnboarding(locale: "fr" | "en" = "fr") {
  const user = await requireUser();
  await db.user.update({
    where: { id: user.id },
    data: { onboardingCompleted: false },
  });
  revalidatePath("/");
  redirect(`/${locale}/onboarding`);
}

export async function completeOnboarding(raw: {
  uiLocale: "fr" | "en";
  llmConfig: unknown;
  name?: string;
}) {
  const user = await requireUser();
  const llm = LlmConfigSchema.parse(raw.llmConfig);
  await db.user.update({
    where: { id: user.id },
    data: {
      uiLocale: raw.uiLocale,
      llmConfig: llm as object,
      onboardingCompleted: true,
      ...(raw.name && raw.name.trim() ? { name: raw.name.trim() } : {}),
    },
  });
  revalidatePath("/");
}
