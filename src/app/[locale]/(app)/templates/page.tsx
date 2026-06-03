import { setRequestLocale } from "next-intl/server";
import {
  type TemplateItem,
  TemplatesGallery,
} from "@/components/templates/TemplatesGallery";
import { type Locale, type LocalizedText, pickLocalized } from "@/lib/i18n";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function TemplatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const templates = await db.template.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { generations: true } } },
  });

  const items: TemplateItem[] = templates.map((t) => ({
    name: t.name,
    type: t.type,
    supportedLanguages: t.supportedLanguages,
    description: pickLocalized(
      t.description as LocalizedText | null,
      locale as Locale,
    ),
    atsCompliant: !!(t.meta as { ats_compliant?: boolean } | null)
      ?.ats_compliant,
    isDefault: t.isDefault,
    version: t.version,
    usedBy: t._count.generations,
  }));

  return <TemplatesGallery templates={items} />;
}
