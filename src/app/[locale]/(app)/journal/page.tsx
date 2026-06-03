import { getTranslations, setRequestLocale } from "next-intl/server";
import { JournalView } from "@/components/journal/JournalView";
import { PageHeader } from "@/components/ui/PageHeader";
import { listPendingFacts } from "@/server/actions/journal";
import { requireUser } from "@/server/auth-helpers";
import { db } from "@/server/db";
import { embeddingsEnabled } from "@/server/rag/embeddings";

export const dynamic = "force-dynamic";

export default async function JournalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("nav");
  const user = await requireUser();
  const [entries, pendingFacts] = await Promise.all([
    db.journalEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        _count: {
          select: {
            extractedFacts: { where: { applied: false, rejectedAt: null } },
          },
        },
      },
    }),
    listPendingFacts(),
  ]);

  const semanticEnabled = embeddingsEnabled(user.llmConfig);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto" }}>
      <PageHeader title={t("journal")} />
      <JournalView
        initialEntries={entries.map((e) => ({
          id: e.id,
          content: e.content,
          language: e.language,
          createdAt: e.createdAt.toISOString(),
          reconciled: e.reconciled,
          factsCount: e._count.extractedFacts,
        }))}
        initialPendingFacts={pendingFacts}
        defaultLanguage={user.uiLocale as "fr" | "en"}
        semanticEnabled={semanticEnabled}
      />
    </div>
  );
}
