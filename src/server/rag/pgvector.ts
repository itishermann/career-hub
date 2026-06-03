/**
 * pgvector access layer.
 *
 * Prisma cannot read/write the `Unsupported("vector(768)")` column, so every
 * vector operation goes through raw SQL here — and ONLY here. The rest of the
 * app stays fully Prisma-typed.
 *
 * Column note: the Prisma field `contentEmbedding` has no `@map`, so the real
 * Postgres column is the quoted camelCase `"contentEmbedding"`.
 */

import { db } from "@/server/db";

/**
 * Serialize a number[] into pgvector's text input form: `[a,b,c]`.
 * pgvector's parser accepts standard float text (including exponent notation),
 * so the default `Number` stringification via join is safe.
 */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}

/** Persist the embedding for a single journal entry. */
export async function storeEntryEmbedding(
  entryId: string,
  vec: number[],
): Promise<void> {
  const literal = toVectorLiteral(vec);
  await db.$executeRaw`
    UPDATE "JournalEntry"
    SET "contentEmbedding" = ${literal}::vector
    WHERE id = ${entryId}
  `;
}

export type SemanticHit = {
  id: string;
  content: string;
  language: string;
  createdAt: Date;
  reconciled: boolean;
  /** cosine similarity in [0,1] — higher is closer. */
  score: number;
};

/**
 * Cosine-similarity search scoped to a user. Only rows that have an embedding
 * participate; entries without one are invisible to semantic search (use
 * full-text or `reindexJournal` to backfill).
 */
export async function semanticSearchEntries(
  userId: string,
  queryVec: number[],
  limit: number,
): Promise<SemanticHit[]> {
  const literal = toVectorLiteral(queryVec);
  const rows = await db.$queryRaw<
    {
      id: string;
      content: string;
      language: string;
      createdAt: Date;
      reconciled: boolean;
      score: number;
    }[]
  >`
    SELECT
      id,
      content,
      language,
      "createdAt",
      reconciled,
      1 - ("contentEmbedding" <=> ${literal}::vector) AS score
    FROM "JournalEntry"
    WHERE "userId" = ${userId} AND "contentEmbedding" IS NOT NULL
    ORDER BY "contentEmbedding" <=> ${literal}::vector
    LIMIT ${limit}
  `;
  // Postgres NUMERIC/double comes back as number with the pg adapter.
  return rows.map((r) => ({ ...r, score: Number(r.score) }));
}

/** Entries that still need an embedding (for backfill / reindex). */
export async function entriesMissingEmbedding(
  userId: string,
): Promise<{ id: string; content: string }[]> {
  return db.$queryRaw<{ id: string; content: string }[]>`
    SELECT id, content
    FROM "JournalEntry"
    WHERE "userId" = ${userId} AND "contentEmbedding" IS NULL
    ORDER BY "createdAt" ASC
  `;
}
