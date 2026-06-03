import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { TemplateEditor } from "@/components/templates/TemplateEditor";
import { type Locale, type LocalizedText, pickLocalized } from "@/lib/i18n";
import { requireUser } from "@/server/auth-helpers";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function TemplateEditorPage({
  params,
}: {
  params: Promise<{ locale: string; name: string }>;
}) {
  const { locale, name } = await params;
  setRequestLocale(locale);
  await requireUser();
  const tpl = await db.template.findUnique({
    where: { name: decodeURIComponent(name) },
  });
  if (!tpl) notFound();

  return (
    <TemplateEditor
      name={tpl.name}
      type={tpl.type}
      version={tpl.version}
      atsCompliant={
        !!(tpl.meta as { ats_compliant?: boolean } | null)?.ats_compliant
      }
      description={pickLocalized(
        tpl.description as LocalizedText | null,
        locale as Locale,
      )}
      initialSource={tpl.typstSource}
    />
  );
}
