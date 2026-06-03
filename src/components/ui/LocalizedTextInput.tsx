"use client";

import { Button, TextInput, Textarea } from "@mantine/core";
import { Languages } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { emptyLocalized, type Locale, type LocalizedText } from "@/lib/i18n";
import styles from "./LocalizedTextInput.module.css";

/**
 * Signature component — used everywhere fields are bilingual.
 *
 * Visual contract:
 *  - Two language tabs (FR / EN) with a filled/empty badge per language.
 *  - Optional "Translate to <other>" ghost button (right-aligned).
 *  - Active language renders a TextInput or Textarea.
 *
 * Both languages remain editable — there is no "source" locked.
 */
export type LocalizedTextInputProps = {
  values: LocalizedText | null | undefined;
  onChange: (value: LocalizedText) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  hint?: string;
  label?: string;
  disabled?: boolean;
  defaultLocale?: Locale;
  /** When provided, shows a Translate button that calls this and pre-fills the other locale. */
  onTranslate?: (sourceLocale: Locale, targetLocale: Locale, sourceText: string) => Promise<string>;
};

export function LocalizedTextInput({
  values,
  onChange,
  multiline = false,
  rows = 4,
  placeholder,
  hint,
  label,
  disabled,
  defaultLocale = "fr",
  onTranslate,
}: LocalizedTextInputProps) {
  const t = useTranslations();
  const id = useId();
  const [active, setActive] = useState<Locale>(defaultLocale);
  const [translating, setTranslating] = useState<Locale | null>(null);

  const safeValues = values ?? emptyLocalized();
  const currentValue = safeValues[active] ?? "";

  const filled = {
    fr: !!safeValues.fr && safeValues.fr.trim().length > 0,
    en: !!safeValues.en && safeValues.en.trim().length > 0,
  };

  const handleChange = (next: string) => {
    onChange({
      ...safeValues,
      [active]: next,
    });
  };

  const handleTranslate = async () => {
    if (!onTranslate) return;
    const other: Locale = active === "fr" ? "en" : "fr";
    if (!filled[active]) return;
    setTranslating(other);
    try {
      const translated = await onTranslate(active, other, safeValues[active] ?? "");
      onChange({
        ...safeValues,
        [other]: translated,
      });
      setActive(other);
    } finally {
      setTranslating(null);
    }
  };

  const otherLocale: Locale = active === "fr" ? "en" : "fr";
  const canTranslate = !!onTranslate && filled[active] && !filled[otherLocale];

  return (
    <div className={styles.root}>
      <div className={styles.tabsRow}>
        {label && (
          <label htmlFor={id} style={{ fontSize: 12, fontWeight: 500, color: "var(--ch-fg-2)" }}>
            {label}
          </label>
        )}
        <div className={styles.tabs} role="tablist">
          {(["fr", "en"] as const).map((loc) => (
            <button
              key={loc}
              type="button"
              role="tab"
              aria-selected={active === loc}
              className={styles.tab}
              data-active={active === loc}
              onClick={() => setActive(loc)}
              disabled={disabled}
            >
              <span>{loc.toUpperCase()}</span>
              <span
                className={styles.tabBadge}
                data-filled={filled[loc]}
              >
                {filled[loc]
                  ? t("profile.sectionStatus.filled")
                  : t("profile.sectionStatus.empty")}
              </span>
            </button>
          ))}
        </div>
        {canTranslate && (
          <Button
            type="button"
            variant="subtle"
            size="compact-xs"
            leftSection={<Languages size={12} />}
            className={styles.translateBtn}
            onClick={handleTranslate}
            loading={translating === otherLocale}
            color="magenta"
          >
            {t("actions.translateTo", { target: otherLocale.toUpperCase() })}
          </Button>
        )}
      </div>

      {multiline ? (
        <Textarea
          id={id}
          value={currentValue}
          onChange={(e) => handleChange(e.currentTarget.value)}
          placeholder={placeholder}
          minRows={rows}
          autosize
          disabled={disabled}
        />
      ) : (
        <TextInput
          id={id}
          value={currentValue}
          onChange={(e) => handleChange(e.currentTarget.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
      )}

      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}
