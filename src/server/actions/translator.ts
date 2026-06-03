"use server";

import { z } from "zod";
import type { Locale } from "@/lib/i18n";
import { requireUser } from "@/server/auth-helpers";
import { getLlmProviderForUser } from "@/server/llm/client";

const TranslateInput = z.object({
  source: z.enum(["fr", "en"]),
  target: z.enum(["fr", "en"]),
  text: z.string().min(1),
  context: z.string().optional(),
});

/**
 * Translate a single field. Used by LocalizedTextInput for the "Translate"
 * button. Routes through the active user's LLM provider — in dev with mode
 * "mock", returns a placeholder that signals translation happened.
 */
export async function translateField(input: {
  source: Locale;
  target: Locale;
  text: string;
  context?: string;
}): Promise<string> {
  const data = TranslateInput.parse(input);
  const user = await requireUser();
  const provider = getLlmProviderForUser(user.llmConfig, `translate:${data.context ?? "generic"}`);
  const prompt = [
    `Translate the following ${data.source.toUpperCase()} text into ${data.target.toUpperCase()}.`,
    `Context: ${data.context ?? "professional profile field"}.`,
    `Preserve register, density and any technical jargon (no over-translation of anglicisms).`,
    `Reply with ONLY the translated text, no preamble.`,
    "",
    "---",
    data.text,
  ].join("\n");
  const result = await provider.generateText({ prompt });
  return result.text.trim();
}
