/**
 * RAG end-to-end smoke test against the real local LLM endpoint + pgvector DB.
 *
 *   bun run scripts/rag-e2e.ts
 *
 * Sets the bootstrap-admin user's llmConfig to `local`, indexes a few sample
 * journal entries through the real embedding endpoint, then verifies storage,
 * semantic ranking, and RAG retrieval. Safe to re-run (skips seeding if the
 * user already has journal entries).
 */

import { db } from "@/server/db";
import { embedText } from "@/server/rag/embeddings";
import {
  entriesMissingEmbedding,
  semanticSearchEntries,
  storeEntryEmbedding,
} from "@/server/rag/pgvector";
import { retrieveJournalContext } from "@/server/rag/retrieve";

const LOCAL = {
  mode: "local" as const,
  local: {
    endpoint: "http://192.168.1.196:11434/v1",
    chatModel: "qwen3.5:9b",
    embeddingModel: "nomic-embed-text",
    embeddingDim: 768,
  },
};

const ADMIN_EMAIL =
  process.env.BOOTSTRAP_ADMIN_EMAIL ?? "jean.dupont@example.com";

async function main() {
  const user =
    (await db.user.findFirst({ where: { email: ADMIN_EMAIL } })) ??
    (await db.user.findFirst({ where: { email: "dev@local" } }));
  if (!user)
    throw new Error("No admin/dev user — run `bun run db:seed` first.");

  await db.user.update({ where: { id: user.id }, data: { llmConfig: LOCAL } });
  console.log(
    `✓ user ${user.email} → llmConfig = local (${LOCAL.local.endpoint})`,
  );

  const existing = await db.journalEntry.count({ where: { userId: user.id } });
  if (existing === 0) {
    const samples = [
      "Aujourd'hui j'ai optimisé un pipeline GitLab CI avec du cache Docker : le build est passé de 12 à 4 minutes.",
      "Mis en place une recherche sémantique pgvector avec des embeddings nomic sur un projet perso Next.js.",
      "Réunion avec un client santé : discussion conformité HIPAA et chiffrement des données patient.",
      "Refacto d'un backend NestJS en architecture hexagonale, séparation ports/adapters propre.",
    ];
    for (const content of samples) {
      const e = await db.journalEntry.create({
        data: { userId: user.id, content, language: "fr" },
      });
      const vec = await embedText(LOCAL, content, "test:index");
      if (vec) {
        await storeEntryEmbedding(e.id, vec);
        console.log(`  indexed (${vec.length}d): ${content.slice(0, 55)}…`);
      } else {
        console.log(`  NO VECTOR: ${content.slice(0, 55)}…`);
      }
    }
  } else {
    console.log(
      `• ${existing} journal entries already present — backfilling any missing vectors`,
    );
    for (const e of await entriesMissingEmbedding(user.id)) {
      const vec = await embedText(LOCAL, e.content, "test:reindex");
      if (vec) await storeEntryEmbedding(e.id, vec);
    }
  }

  const [{ n }] = await db.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM "JournalEntry"
    WHERE "userId" = ${user.id} AND "contentEmbedding" IS NOT NULL
  `;
  console.log(`✓ entries with embedding: ${n}`);

  const q = "scalabilité CI/CD et performance de build";
  const qv = await embedText(LOCAL, q, "test:search");
  if (!qv) throw new Error("query embedding failed");
  const hits = await semanticSearchEntries(user.id, qv, 5);
  console.log(`\n● semantic search — "${q}"`);
  for (const h of hits)
    console.log(`   ${h.score.toFixed(3)}  ${h.content.slice(0, 64)}…`);

  const ctx = await retrieveJournalContext({
    userId: user.id,
    rawLlmConfig: LOCAL,
    queryText: "Lead DevOps santé, conformité HIPAA, Kubernetes",
    k: 3,
  });
  console.log(`\n● RAG context for a "DevOps santé" role (top ${ctx.length}):`);
  for (const c of ctx) console.log(`   - ${c.content.slice(0, 64)}…`);

  await db.$disconnect();
  console.log("\n✓ RAG e2e OK");
}

main().catch((e) => {
  console.error("✗ RAG e2e failed:", e);
  process.exit(1);
});
