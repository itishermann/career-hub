/**
 * Local LLM provider — talks to an OpenAI-compatible endpoint (Ollama, LM
 * Studio, llama.cpp server) via the Vercel AI SDK.
 *
 * Implements the shared `LlmProvider` interface so the rest of the app is
 * agnostic to the backend. All four capabilities are wired:
 *  - generateText  → AI SDK generateText
 *  - generateJson  → AI SDK generateObject, with a text+JSON.parse fallback for
 *                    models that don't honour structured-output mode
 *  - streamText    → AI SDK streamText (adapted to our chunk shape)
 *  - embed         → AI SDK embed, with a hard guard that the returned vector
 *                    length matches the configured dimension
 */

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { embed as aiEmbed, generateObject, generateText, streamText } from "ai";
import type { z } from "zod";
import type {
  LlmCallContext,
  LlmJsonResult,
  LlmProvider,
  LlmStreamChunk,
  LlmTextResult,
} from "../client";

// Generous chat timeout: local reasoning models (e.g. qwen3.5) emit long hidden
// reasoning traces and can take many minutes for a full CV/LM. Measured: a
// modest CV prompt (~3k tokens) takes ~250s on qwen3.5:9b; adding a campaign JD
// + journal RAG (~5k tokens) pushes it past 300s and the old cap fired mid-run
// ("operation aborted due to timeout"). 600s gives headroom. The real cure is a
// faster/non-reasoning generation model — see /settings/llm. Embeddings stay quick.
const CHAT_TIMEOUT_MS = 600_000;
const EMBED_TIMEOUT_MS = 30_000;

export function localProvider(ctx: LlmCallContext): LlmProvider {
  const cfg = ctx.config.local;
  if (!cfg?.endpoint) {
    throw new Error(
      "[llm:local] no endpoint configured. Set it in /settings/llm (e.g. http://192.168.1.196:11434/v1).",
    );
  }

  const client = createOpenAICompatible({
    name: "local",
    baseURL: cfg.endpoint,
    // Many local servers ignore the key but the SDK wants a string.
    apiKey: cfg.apiKey && cfg.apiKey.length > 0 ? cfg.apiKey : "local",
  });

  const chatModelId = cfg.chatModel;
  const embeddingModelId = cfg.embeddingModel;
  const embeddingDim = cfg.embeddingDim;
  const contextLength = cfg.contextLength ?? 32768;

  // Forwarded verbatim into the request body. The provider name passed to
  // createOpenAICompatible ("local") is the providerOptions namespace key.
  // Ollama honours `options.num_ctx` on its /v1/chat/completions endpoint —
  // this raises the runtime context window above the 8192 default so a long
  // prompt + a reasoning model's <think> trace still leaves room for the answer.
  const ollamaProviderOptions = {
    local: { options: { num_ctx: contextLength } },
  } as const;

  return {
    mode: "local",
    model: chatModelId,

    async generateText({ system, prompt }): Promise<LlmTextResult> {
      const start = Date.now();
      const result = await generateText({
        model: client.chatModel(chatModelId),
        system,
        prompt,
        providerOptions: ollamaProviderOptions,
        abortSignal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
      });
      const text = cleanGeneratedText(result.text);
      if (text.length === 0) {
        throw new Error(emptyOutputMessage(chatModelId, contextLength, result));
      }
      return {
        text,
        provider: "local",
        model: chatModelId,
        usage: {
          inputTokens: result.usage?.inputTokens,
          outputTokens: result.usage?.outputTokens,
          costCents: 0,
          durationMs: Date.now() - start,
        },
      };
    },

    async generateJson<T>({
      system,
      prompt,
      schema,
    }: {
      system?: string;
      prompt: string;
      schema: z.ZodType<T>;
    }): Promise<LlmJsonResult<T>> {
      const start = Date.now();
      try {
        const result = await generateObject({
          model: client.chatModel(chatModelId),
          schema,
          system,
          prompt,
          providerOptions: ollamaProviderOptions,
          abortSignal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
        });
        return {
          data: result.object,
          provider: "local",
          model: chatModelId,
          usage: {
            inputTokens: result.usage?.inputTokens,
            outputTokens: result.usage?.outputTokens,
            costCents: 0,
            durationMs: Date.now() - start,
          },
        };
      } catch (err) {
        // Fallback: some local models don't support structured-output mode.
        // Ask for raw JSON, extract the first {...} block, validate with Zod.
        console.warn(
          "[llm:local] generateObject failed, falling back to text+parse:",
          err,
        );
        const textResult = await generateText({
          model: client.chatModel(chatModelId),
          system,
          prompt: `${prompt}\n\nRéponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans backticks.`,
          providerOptions: ollamaProviderOptions,
          abortSignal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
        });
        const parsed = schema.parse(extractJson(textResult.text));
        return {
          data: parsed,
          provider: "local",
          model: chatModelId,
          usage: {
            inputTokens: textResult.usage?.inputTokens,
            outputTokens: textResult.usage?.outputTokens,
            costCents: 0,
            durationMs: Date.now() - start,
          },
        };
      }
    },

    async *streamText({ system, prompt }): AsyncIterable<LlmStreamChunk> {
      try {
        const result = streamText({
          model: client.chatModel(chatModelId),
          system,
          prompt,
          providerOptions: ollamaProviderOptions,
          abortSignal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
        });
        for await (const delta of result.textStream) {
          yield { type: "text", text: delta };
        }
        yield { type: "done" };
      } catch (err) {
        yield {
          type: "error",
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },

    async embed({ text }) {
      const result = await aiEmbed({
        model: client.textEmbeddingModel(embeddingModelId),
        value: text,
        abortSignal: AbortSignal.timeout(EMBED_TIMEOUT_MS),
      });
      const vector = result.embedding;
      if (vector.length !== embeddingDim) {
        throw new Error(
          `[llm:local] embedding dimension mismatch: model "${embeddingModelId}" returned ${vector.length} dims but config expects ${embeddingDim}. ` +
            `Fix the embedding dim in /settings/llm (or switch model) — the pgvector column is fixed at ${embeddingDim}.`,
        );
      }
      return { vector, model: embeddingModelId };
    },
  };
}

/**
 * Strip reasoning-model artefacts from generated text. Some Ollama versions
 * inline the chain-of-thought as a `<think>…</think>` block inside `content`
 * (rather than the separate `reasoning` field) — that block is never part of
 * the requested output (Typst, translation, …) and must be removed.
 */
function cleanGeneratedText(raw: string): string {
  return (
    raw
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      // An unclosed <think> (model ran out of budget mid-thought) leaves a
      // dangling open tag with reasoning after it — drop everything from it on.
      .replace(/<think>[\s\S]*$/i, "")
      .trim()
  );
}

/**
 * Build an actionable error when the model returns no usable text. The usual
 * culprit is a reasoning model whose <think> trace fills the context window,
 * leaving nothing for the answer (finishReason "length"). Surface the cause
 * instead of silently persisting an empty generation.
 */
function emptyOutputMessage(
  model: string,
  contextLength: number,
  result: { finishReason?: string; usage?: { outputTokens?: number } },
): string {
  const reason = result.finishReason ?? "unknown";
  const outTokens = result.usage?.outputTokens ?? 0;
  const truncated = reason === "length";
  return (
    `Le modèle « ${model} » n'a produit aucun texte exploitable ` +
    `(finishReason=${reason}, ${outTokens} tokens générés). ` +
    (truncated
      ? `Il s'agit très probablement d'un modèle de raisonnement dont le « thinking » sature la fenêtre de contexte (num_ctx=${contextLength}). ` +
        `Augmente la taille de contexte dans /settings/llm, ou choisis un modèle non-reasoning pour la génération.`
      : `Vérifie le modèle configuré dans /settings/llm — il peut renvoyer uniquement du raisonnement sans contenu final.`)
  );
}

/** Extract the first balanced JSON object/array from a free-text LLM reply. */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1] ?? text;
  const firstBrace = candidate.search(/[[{]/);
  if (firstBrace === -1) return JSON.parse(candidate);
  // Find the matching closing bracket by scanning.
  const open = candidate[firstBrace];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  for (let i = firstBrace; i < candidate.length; i++) {
    if (candidate[i] === open) depth++;
    else if (candidate[i] === close) {
      depth--;
      if (depth === 0) return JSON.parse(candidate.slice(firstBrace, i + 1));
    }
  }
  return JSON.parse(candidate.slice(firstBrace));
}
