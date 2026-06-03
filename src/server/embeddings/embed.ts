/**
 * Journal embeddings — DECOUPLED from the chat provider.
 *
 * The chat model (Claude, Ollama, …) and the embedding model are independent:
 * you can generate CVs with Claude while still vectorising the journal with a
 * small local embedder. Two backends are supported, with automatic fallback:
 *
 *  - "ollama"        → an OpenAI-compatible /embeddings endpoint (nomic-embed-text)
 *  - "transformers"  → in-process transformers.js (onnxruntime), no service needed
 *
 * Both default to nomic-embed-text (768-dim) so vectors share the same space and
 * match the fixed pgvector column. Callers pass a `role` so nomic's task prefixes
 * are applied consistently (document vs query).
 */

import { env as appEnv } from "@/lib/env";
import type { EmbeddingsConfig } from "@/server/llm/client";

export type EmbedRole = "document" | "query";

export type EmbedResult = { vector: number[]; model: string };

function nomicPrefix(model: string, role: EmbedRole, text: string): string {
  if (!model.toLowerCase().includes("nomic")) return text;
  return role === "query"
    ? `search_query: ${text}`
    : `search_document: ${text}`;
}

// ---------------------------------------------------------------------------
// Ollama (OpenAI-compatible /embeddings)
// ---------------------------------------------------------------------------
async function ollamaEmbed(
  cfg: EmbeddingsConfig,
  input: string,
): Promise<EmbedResult> {
  if (!cfg.endpoint) {
    throw new Error(
      "[embeddings] ollama provider selected but no endpoint set",
    );
  }
  const url = `${cfg.endpoint.replace(/\/$/, "")}/embeddings`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cfg.apiKey ? { authorization: `Bearer ${cfg.apiKey}` } : {}),
    },
    body: JSON.stringify({ model: cfg.model, input }),
  });
  if (!res.ok) {
    throw new Error(
      `[embeddings] ollama ${res.status}: ${(await res.text()).slice(0, 200)}`,
    );
  }
  const json = (await res.json()) as {
    data?: { embedding: number[] }[];
  };
  const vector = json.data?.[0]?.embedding;
  if (!vector) throw new Error("[embeddings] ollama returned no embedding");
  return { vector, model: cfg.model };
}

// ---------------------------------------------------------------------------
// transformers.js (in-process, onnxruntime) — lazy singleton pipeline
// ---------------------------------------------------------------------------
type FeatureExtractor = (
  text: string,
  opts: { pooling: "mean"; normalize: boolean },
) => Promise<{ data: Float32Array | number[] }>;

const extractorCache = new Map<string, Promise<FeatureExtractor>>();

async function getExtractor(model: string): Promise<FeatureExtractor> {
  let p = extractorCache.get(model);
  if (!p) {
    p = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      // Cache downloaded models under STORAGE_PATH so the writable volume keeps
      // them across restarts (and the container user can write there).
      env.cacheDir = `${appEnv.STORAGE_PATH.replace(/\/$/, "")}/transformers`;
      return (await pipeline(
        "feature-extraction",
        model,
      )) as unknown as FeatureExtractor;
    })();
    extractorCache.set(model, p);
  }
  return p;
}

async function transformersEmbed(
  cfg: EmbeddingsConfig,
  input: string,
): Promise<EmbedResult> {
  const extractor = await getExtractor(cfg.transformersModel);
  const out = await extractor(input, { pooling: "mean", normalize: true });
  const vector = Array.from(out.data as ArrayLike<number>);
  return { vector, model: cfg.transformersModel };
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------
export function embeddingsConfigEnabled(cfg: EmbeddingsConfig): boolean {
  return cfg.provider !== "none";
}

/**
 * Embed text, or return null when embeddings are disabled. Validates the vector
 * dimension against the configured/expected size (the pgvector column is fixed).
 * Ollama failures fall back to transformers.js when enabled.
 */
export async function embedWith(
  cfg: EmbeddingsConfig,
  text: string,
  role: EmbedRole,
): Promise<EmbedResult | null> {
  if (cfg.provider === "none") return null;
  const input = nomicPrefix(
    cfg.provider === "transformers" ? cfg.transformersModel : cfg.model,
    role,
    text,
  );

  let result: EmbedResult;
  if (cfg.provider === "transformers") {
    result = await transformersEmbed(cfg, input);
  } else {
    try {
      result = await ollamaEmbed(cfg, input);
    } catch (err) {
      if (!cfg.fallbackTransformers) throw err;
      console.warn(
        "[embeddings] ollama failed, falling back to in-process transformers.js:",
        err instanceof Error ? err.message : err,
      );
      // Re-apply the prefix for the transformers model name (still nomic → same).
      result = await transformersEmbed(
        cfg,
        nomicPrefix(cfg.transformersModel, role, text),
      );
    }
  }

  if (result.vector.length !== cfg.dim) {
    throw new Error(
      `[embeddings] dimension mismatch: ${result.model} returned ${result.vector.length} dims but the pgvector column expects ${cfg.dim}. ` +
        "Pick a 768-dim model or migrate the column.",
    );
  }
  return result;
}
