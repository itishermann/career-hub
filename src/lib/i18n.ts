import { z } from "zod";

export const SUPPORTED_LOCALES = ["fr", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";

export const LocaleSchema = z.enum(SUPPORTED_LOCALES);

export const LocalizedTextSchema = z.object({
  fr: z.string().nullish(),
  en: z.string().nullish(),
});
export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

export const LocalizedStringArraySchema = z.object({
  fr: z.array(z.string()).nullish(),
  en: z.array(z.string()).nullish(),
});
export type LocalizedStringArray = z.infer<typeof LocalizedStringArraySchema>;

/**
 * Pick the value for a locale, with explicit fallback strategy.
 * `fallback: "other"` falls back to the other locale; `null` returns null if missing.
 */
export function pickLocalized(
  text: LocalizedText | null | undefined,
  preferred: Locale,
  options?: { fallback?: "other" | null },
): string | null {
  if (!text) return null;
  const primary = text[preferred];
  if (primary !== undefined && primary !== null && primary !== "") return primary;
  const fallback = "fallback" in (options ?? {}) ? options!.fallback : "other";
  if (fallback === null) return null;
  const other = preferred === "fr" ? "en" : "fr";
  const fallbackVal = text[other];
  return fallbackVal !== undefined && fallbackVal !== null && fallbackVal !== "" ? fallbackVal : null;
}

export function pickLocalizedArray(
  arr: LocalizedStringArray | null | undefined,
  preferred: Locale,
  options?: { fallback?: "other" | null },
): string[] {
  if (!arr) return [];
  const primary = arr[preferred];
  if (primary && primary.length > 0) return primary;
  const fallback = "fallback" in (options ?? {}) ? options!.fallback : "other";
  if (fallback === null) return [];
  const other = preferred === "fr" ? "en" : "fr";
  return arr[other] ?? [];
}

export function isLocalizedFilled(text: LocalizedText | null | undefined, locale: Locale): boolean {
  if (!text) return false;
  const v = text[locale];
  return !!v && v.trim().length > 0;
}

export function mergeLocalized(
  existing: LocalizedText | null | undefined,
  patch: Partial<LocalizedText>,
): LocalizedText {
  return {
    fr: patch.fr !== undefined ? patch.fr : existing?.fr ?? null,
    en: patch.en !== undefined ? patch.en : existing?.en ?? null,
  };
}

export function emptyLocalized(): LocalizedText {
  return { fr: null, en: null };
}
