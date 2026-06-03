-- HNSW index for cosine-similarity search over journal embeddings.
-- Partial index: only rows that actually have an embedding are indexed.
-- Prisma does not manage indexes on Unsupported("vector") columns, so this
-- lives as a raw migration and does not cause schema drift.
CREATE INDEX IF NOT EXISTS "journal_entries_embedding_idx"
ON "JournalEntry"
USING hnsw ("contentEmbedding" vector_cosine_ops)
WHERE "contentEmbedding" IS NOT NULL;
