/**
 * Embedding helpers shared by journal indexing and RAG retrieval.
 *
 * Embeddings are now DECOUPLED from the chat provider (see
 * `@/server/embeddings/embed`): they are driven by the user's `embeddings`
 * config (Ollama and/or in-process transformers.js), so the journal can be
 * vectorised even when chatting via Claude. Legacy `mode: "local"` configs are
 * mapped automatically (see resolveEmbeddingsConfig).
 */

import { embeddingsConfigEnabled, embedWith } from "@/server/embeddings/embed";
import { resolveEmbeddingsConfig } from "@/server/llm/client";

export function embeddingsEnabled(rawLlmConfig: unknown): boolean {
  return embeddingsConfigEnabled(resolveEmbeddingsConfig(rawLlmConfig));
}

/**
 * Embed a piece of text, or return null when embeddings are unavailable.
 * The `task` tag (e.g. "journal:index" / "journal:search") selects the nomic
 * role prefix. Throws only on a genuine backend error — best-effort callers
 * should wrap in try/catch.
 */
export async function embedText(
  rawLlmConfig: unknown,
  text: string,
  task = "embed",
): Promise<number[] | null> {
  const cfg = resolveEmbeddingsConfig(rawLlmConfig);
  if (!embeddingsConfigEnabled(cfg)) return null;
  const role = task.includes("search") ? "query" : "document";
  const result = await embedWith(cfg, text, role);
  return result?.vector ?? null;
}
