"use client";

import { SegmentedControl } from "@mantine/core";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [pending, startTransition] = useTransition();

  function onChange(next: string) {
    startTransition(() => {
      router.replace(
        // @ts-expect-error params is a generic Record from useParams
        { pathname, params },
        { locale: next as (typeof routing.locales)[number] },
      );
    });
  }

  return (
    <SegmentedControl
      value={locale}
      onChange={onChange}
      size="xs"
      data={routing.locales.map((l) => ({ value: l, label: l.toUpperCase() }))}
      disabled={pending}
    />
  );
}
