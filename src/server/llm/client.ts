/**
 * Unified LLM client factory.
 *
 * ALL LLM interactions in the app go through this module. Direct imports of
 * @ai-sdk/anthropic or openai SDKs from elsewhere are forbidden (see AGENTS.md).
 *
 * The factory inspects the per-user llmConfig and returns:
 *  - mode "mock"     : canned responses (dev default — no API key required)
 *  - mode "anthropic": Anthropic provider via Vercel AI SDK
 *  - mode "local"    : OpenAI-compatible endpoint (Ollama, LM Studio, llama.cpp)
 *
 * Phase 1 ships the abstraction + mock. Real providers wired in phase 2.
 */

import { z } from "zod";

// Chat/generation provider modes. `claude_cli` shells out to the local
// `claude -p` CLI; `claude_sdk` uses the Claude Agent SDK in-process. Both use
// the CLI's own auth (subscription) — no API key needed.
export const LlmModeSchema = z.enum([
  "mock",
  "local",
  "anthropic",
  "claude_cli",
  "claude_sdk",
]);
export type LlmMode = z.infer<typeof LlmModeSchema>;

// Embeddings are configured INDEPENDENTLY of the chat mode (Claude has no
// embeddings API). So a user can chat via Claude and still vectorise the
// journal via a local embedder.
export const EmbeddingProviderSchema = z.enum([
  "none",
  "ollama",
  "transformers",
]);
export type EmbeddingProvider = z.infer<typeof EmbeddingProviderSchema>;

export const EmbeddingsConfigSchema = z.object({
  provider: EmbeddingProviderSchema.default("none"),
  // ollama (OpenAI-compatible endpoint):
  endpoint: z.string().url().optional(),
  apiKey: z.string().optional(),
  model: z.string().default("nomic-embed-text"),
  dim: z.number().int().positive().default(768),
  // When provider="ollama", fall back to the in-process transformers.js
  // embedder if the endpoint is unreachable (keeps the journal indexed offline).
  fallbackTransformers: z.boolean().default(true),
  // transformers.js model id (must be a 768-dim model to match the pgvector
  // column; nomic keeps the same space as the Ollama nomic model).
  transformersModel: z.string().default("nomic-ai/nomic-embed-text-v1.5"),
});
export type EmbeddingsConfig = z.infer<typeof EmbeddingsConfigSchema>;

export const LlmConfigSchema = z.object({
  mode: LlmModeSchema.default("mock"),
  anthropic: z
    .object({
      apiKey: z.string().optional(),
      chatModel: z.string().default("claude-opus-4-7"),
    })
    .optional(),
  local: z
    .object({
      endpoint: z.string().url().optional(),
      apiKey: z.string().optional(),
      chatModel: z.string().default("llama3.3:70b"),
      embeddingModel: z.string().default("nomic-embed-text"),
      embeddingDim: z.number().int().positive().default(768),
      // Runtime context window (Ollama num_ctx). Defaults well above the
      // server's own 8192 default: a long CV/LM prompt (~5k tokens) plus a
      // reasoning model's <think> trace easily exhausts 8192, leaving zero
      // room to emit the answer (text comes back empty). 32768 gives headroom.
      contextLength: z.number().int().positive().default(32768),
    })
    .optional(),
  // `claude -p` subprocess provider.
  claudeCli: z
    .object({
      binPath: z.string().default("claude"),
      chatModel: z.string().default("sonnet"),
      timeoutMs: z.number().int().positive().default(300_000),
    })
    .optional(),
  // Claude Agent SDK provider (in-process query()).
  claudeSdk: z
    .object({
      chatModel: z.string().default("sonnet"),
      timeoutMs: z.number().int().positive().default(300_000),
    })
    .optional(),
  // Decoupled embeddings (independent of `mode`).
  embeddings: EmbeddingsConfigSchema.optional(),
});

export type LlmConfig = z.infer<typeof LlmConfigSchema>;

export function parseLlmConfig(raw: unknown): LlmConfig {
  const parsed = LlmConfigSchema.safeParse(raw);
  if (!parsed.success) return { mode: "mock" };
  return parsed.data;
}

// ---------------------------------------------------------------------------
// Public surface : tasks the rest of the app calls.
// ---------------------------------------------------------------------------

export type LlmCallContext = {
  config: LlmConfig;
  /** Optional per-call logical task tag, surfaced in mock and telemetry. */
  task?: string;
};

export type LlmUsage = {
  inputTokens?: number;
  outputTokens?: number;
  costCents?: number;
  durationMs: number;
};

export type LlmTextResult = {
  text: string;
  provider: LlmMode;
  model: string;
  usage: LlmUsage;
};

export type LlmJsonResult<T> = {
  data: T;
  provider: LlmMode;
  model: string;
  usage: LlmUsage;
};

export type LlmStreamChunk = {
  type: "text" | "done" | "error";
  text?: string;
  error?: string;
};

// ---------------------------------------------------------------------------
// Provider abstraction
// ---------------------------------------------------------------------------

export interface LlmProvider {
  readonly mode: LlmMode;
  readonly model: string;

  generateText(input: {
    system?: string;
    prompt: string;
  }): Promise<LlmTextResult>;

  generateJson<T>(input: {
    system?: string;
    prompt: string;
    schema: z.ZodType<T>;
  }): Promise<LlmJsonResult<T>>;

  streamText(input: {
    system?: string;
    prompt: string;
  }): AsyncIterable<LlmStreamChunk>;

  /**
   * embeddings: only supported in mode=local (Anthropic does not provide
   * embeddings). Returns null when unsupported — callers must handle.
   */
  embed?(input: {
    text: string;
  }): Promise<{ vector: number[]; model: string } | null>;
}

// ---------------------------------------------------------------------------
// Mock provider — canned deterministic responses
// ---------------------------------------------------------------------------

import { claudeCliProvider } from "./providers/claude-cli";
import { claudeSdkProvider } from "./providers/claude-sdk";
import { localProvider } from "./providers/local";
import { mockGenerator } from "./providers/mock";

export function getLlmProvider(ctx: LlmCallContext): LlmProvider {
  const mode = ctx.config.mode;
  switch (mode) {
    case "mock":
      return mockGenerator(ctx);
    case "anthropic":
      // Anthropic real provider is a separate slice; mock keeps the app usable.
      console.warn(
        "[llm] anthropic provider not yet wired — falling back to mock",
      );
      return mockGenerator({ ...ctx, task: ctx.task ?? "fallback:anthropic" });
    case "local":
      return localProvider(ctx);
    case "claude_cli":
      return claudeCliProvider(ctx);
    case "claude_sdk":
      return claudeSdkProvider(ctx);
    default:
      return mockGenerator(ctx);
  }
}

/**
 * Convenience: build a provider for a user from raw llmConfig stored in DB.
 */
export function getLlmProviderForUser(
  rawConfig: unknown,
  task?: string,
): LlmProvider {
  // E2E / CI override: force deterministic mock responses regardless of the
  // user's configured mode (no external Ollama/Anthropic dependency).
  if (process.env.LLM_FORCE_MOCK === "true") {
    return getLlmProvider({ config: { mode: "mock" }, task });
  }
  return getLlmProvider({ config: parseLlmConfig(rawConfig), task });
}

export function getLlmModeForUser(rawConfig: unknown): LlmMode {
  return parseLlmConfig(rawConfig).mode;
}

/**
 * Resolve the embeddings configuration, independent of the chat mode.
 *
 * Backward compatibility: existing users have `mode: "local"` with embedding
 * settings under `local.*` and no `embeddings` block — derive an Ollama
 * embeddings config from those so their journal keeps indexing. New configs set
 * `embeddings` explicitly (and can mix e.g. chat=claude_sdk + embeddings=ollama).
 */
export function resolveEmbeddingsConfig(rawConfig: unknown): EmbeddingsConfig {
  const config = parseLlmConfig(rawConfig);
  if (config.embeddings && config.embeddings.provider !== "none") {
    return config.embeddings;
  }
  if (config.embeddings?.provider === "none") {
    // Explicitly disabled.
    return config.embeddings;
  }
  // No embeddings block: derive from legacy local config if present.
  if (config.mode === "local" && config.local?.endpoint) {
    return EmbeddingsConfigSchema.parse({
      provider: "ollama",
      endpoint: config.local.endpoint,
      apiKey: config.local.apiKey,
      model: config.local.embeddingModel,
      dim: config.local.embeddingDim,
    });
  }
  return EmbeddingsConfigSchema.parse({ provider: "none" });
}
