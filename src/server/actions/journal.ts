"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { LocaleSchema } from "@/lib/i18n";
import { requireUser } from "@/server/auth-helpers";
import { db } from "@/server/db";
import { publishDomainEvent } from "@/server/events/domain-events";
import { enqueueJob } from "@/server/jobs/queue";
import { getLlmModeForUser } from "@/server/llm/client";
import { embeddingsEnabled, embedText } from "@/server/rag/embeddings";
import {
  entriesMissingEmbedding,
  type SemanticHit,
  semanticSearchEntries,
  storeEntryEmbedding,
} from "@/server/rag/pgvector";

const AddEntryInput = z.object({
  content: z.string().min(1).max(8000),
  language: LocaleSchema.optional(),
});

export async function addJournalEntry(raw: z.infer<typeof AddEntryInput>) {
  const user = await requireUser();
  const data = AddEntryInput.parse(raw);
  const language = data.language ?? (user.uiLocale as "fr" | "en");

  const entry = await db.journalEntry.create({
    data: { userId: user.id, content: data.content, language },
  });

  try {
    const vector = await embedText(
      user.llmConfig,
      data.content,
      "journal:index",
    );
    if (vector) await storeEntryEmbedding(entry.id, vector);
  } catch (err) {
    console.warn(
      `[journal] embedding failed for entry ${entry.id} (kept without vector):`,
      err,
    );
  }

  // Domain event → enqueues a FACT_EXTRACTION job for this entry.
  await publishDomainEvent({
    type: "journal.entry.created",
    userId: user.id,
    journalEntryId: entry.id,
  });

  revalidatePath("/journal");
  return entry.id;
}

const SearchInput = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(50).optional(),
});

export type JournalSearchHit = {
  id: string;
  content: string;
  language: string;
  createdAt: Date;
  reconciled: boolean;
  score?: number;
};

export async function searchJournal(
  raw: z.infer<typeof SearchInput>,
): Promise<JournalSearchHit[]> {
  const user = await requireUser();
  const data = SearchInput.parse(raw);
  const limit = data.limit ?? 20;

  if (embeddingsEnabled(user.llmConfig)) {
    try {
      const vector = await embedText(
        user.llmConfig,
        data.query,
        "journal:search",
      );
      if (vector) {
        const hits: SemanticHit[] = await semanticSearchEntries(
          user.id,
          vector,
          limit,
        );
        if (hits.length > 0) return hits;
      }
    } catch (err) {
      console.warn(
        "[journal] semantic search failed, falling back to full-text:",
        err,
      );
    }
  }

  const rows = await db.journalEntry.findMany({
    where: {
      userId: user.id,
      content: { contains: data.query, mode: "insensitive" },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      content: true,
      language: true,
      createdAt: true,
      reconciled: true,
    },
  });
  return rows;
}

export async function deleteJournalEntry(id: string) {
  const user = await requireUser();
  await db.journalEntry.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/journal");
}

export async function reindexJournal(): Promise<{
  embedded: number;
  skipped: number;
}> {
  const user = await requireUser();
  if (!embeddingsEnabled(user.llmConfig)) return { embedded: 0, skipped: 0 };
  const pending = await entriesMissingEmbedding(user.id);
  let embedded = 0;
  let skipped = 0;
  for (const e of pending) {
    try {
      const vector = await embedText(
        user.llmConfig,
        e.content,
        "journal:reindex",
      );
      if (vector) {
        await storeEntryEmbedding(e.id, vector);
        embedded++;
      } else skipped++;
    } catch (err) {
      console.warn(`[journal] reindex failed for entry ${e.id}:`, err);
      skipped++;
    }
  }
  revalidatePath("/journal");
  return { embedded, skipped };
}

// ---------------------------------------------------------------------------
// Fact extraction + reconciliation
// ---------------------------------------------------------------------------

/** Enqueue fact extraction for an entry. Returns the job id. */
export async function extractFactsFromEntry(
  entryId: string,
): Promise<{ jobId: string }> {
  const user = await requireUser();
  const entry = await db.journalEntry.findFirst({
    where: { id: entryId, userId: user.id },
  });
  if (!entry) throw new Error("Entry not found");
  const job = await enqueueJob(user.id, "FACT_EXTRACTION", {
    journalEntryId: entryId,
  });
  return { jobId: job.id };
}

/** Flip the entry to reconciled once no pending facts remain. Returns the new state. */
async function maybeReconcile(entryId: string): Promise<boolean> {
  const pending = await db.extractedFact.count({
    where: { journalEntryId: entryId, applied: false, rejectedAt: null },
  });
  if (pending === 0) {
    await db.journalEntry.update({
      where: { id: entryId },
      data: { reconciled: true, reconciledAt: new Date() },
    });
    return true;
  }
  return false;
}

/** Result of reconciling a single fact — lets the client patch the entry row in place. */
export type ReconcileResult = {
  journalEntryId: string;
  /** True when the parent entry has no more pending facts (now reconciled). */
  entryReconciled: boolean;
};

/** Apply a fact to the profile (skills are materialised; others just marked). */
export async function applyExtractedFact(
  factId: string,
): Promise<ReconcileResult> {
  const user = await requireUser();
  const fact = await db.extractedFact.findFirst({
    where: { id: factId, journalEntry: { userId: user.id } },
  });
  if (!fact) throw new Error("Fact not found");

  const content = fact.factContent as Record<string, unknown>;
  if (fact.factType === "skill" && typeof content.name === "string") {
    const category =
      typeof content.category === "string" ? content.category : "other";
    await db.skill.upsert({
      where: {
        userId_category_name: { userId: user.id, category, name: content.name },
      },
      update: {},
      create: { userId: user.id, category, name: content.name },
    });
  }
  await db.extractedFact.update({
    where: { id: fact.id },
    data: { applied: true, appliedAt: new Date() },
  });
  const entryReconciled = await maybeReconcile(fact.journalEntryId);
  revalidatePath("/journal");
  revalidatePath("/profile");
  return { journalEntryId: fact.journalEntryId, entryReconciled };
}

export async function rejectExtractedFact(
  factId: string,
  reason?: string,
): Promise<ReconcileResult> {
  const user = await requireUser();
  const fact = await db.extractedFact.findFirst({
    where: { id: factId, journalEntry: { userId: user.id } },
  });
  if (!fact) throw new Error("Fact not found");
  await db.extractedFact.update({
    where: { id: fact.id },
    data: { rejectedAt: new Date(), rejectionReason: reason ?? null },
  });
  const entryReconciled = await maybeReconcile(fact.journalEntryId);
  revalidatePath("/journal");
  return { journalEntryId: fact.journalEntryId, entryReconciled };
}

export type PendingFact = {
  id: string;
  journalEntryId: string;
  factType: string;
  summary: string;
  entryExcerpt: string;
};

export async function listPendingFacts(): Promise<PendingFact[]> {
  const user = await requireUser();
  const facts = await db.extractedFact.findMany({
    where: {
      applied: false,
      rejectedAt: null,
      journalEntry: { userId: user.id },
    },
    orderBy: { createdAt: "desc" },
    include: { journalEntry: { select: { content: true } } },
  });
  return facts.map((f) => {
    const c = f.factContent as Record<string, unknown>;
    return {
      id: f.id,
      journalEntryId: f.journalEntryId,
      factType: f.factType,
      summary: typeof c._summary === "string" ? c._summary : f.factType,
      entryExcerpt: f.journalEntry.content.slice(0, 90),
    };
  });
}

export async function getJournalIndexingMode() {
  const user = await requireUser();
  return getLlmModeForUser(user.llmConfig);
}
