/**
 * RAG retrieval for generation.
 *
 * Given a query (typically the target role + job description), return the most
 * relevant journal excerpts to inject into a CV/LM prompt. Semantic in
 * local/mock mode; keyword full-text in anthropic mode. Always best-effort —
 * retrieval failures degrade to an empty context, never break generation.
 */

import { db } from "@/server/db";
import { embeddingsEnabled, embedText } from "./embeddings";
import { semanticSearchEntries } from "./pgvector";

export type JournalExcerpt = { content: string; createdAt: string };

export async function retrieveJournalContext(params: {
  userId: string;
  rawLlmConfig: unknown;
  queryText: string;
  k?: number;
}): Promise<JournalExcerpt[]> {
  const { userId, rawLlmConfig, queryText } = params;
  const k = params.k ?? 10;
  if (!queryText.trim()) return [];

  // Semantic path.
  if (embeddingsEnabled(rawLlmConfig)) {
    try {
      const vec = await embedText(rawLlmConfig, queryText, "rag:retrieve");
      if (vec) {
        const hits = await semanticSearchEntries(userId, vec, k);
        if (hits.length > 0) {
          return hits.map((h) => ({
            content: h.content,
            createdAt: h.createdAt.toISOString(),
          }));
        }
      }
    } catch (err) {
      console.warn(
        "[rag] semantic retrieve failed, falling back to full-text:",
        err,
      );
    }
  }

  // Full-text fallback: OR-match the longer query terms.
  const terms = queryText
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((w) => w.length > 3)
    .slice(0, 6);
  if (terms.length === 0) return [];

  try {
    const rows = await db.journalEntry.findMany({
      where: {
        userId,
        OR: terms.map((t) => ({
          content: { contains: t, mode: "insensitive" as const },
        })),
      },
      orderBy: { createdAt: "desc" },
      take: k,
      select: { content: true, createdAt: true },
    });
    return rows.map((r) => ({
      content: r.content,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (err) {
    console.warn(
      "[rag] full-text retrieve failed, returning empty context:",
      err,
    );
    return [];
  }
}

/** Build the retrieval query from a campaign's role + job description. */
export function campaignQueryText(campaign: {
  targetRole?: string | null;
  jobDescription?: string | null;
}): string {
  return [campaign.targetRole, campaign.jobDescription]
    .filter(Boolean)
    .join("\n");
}
