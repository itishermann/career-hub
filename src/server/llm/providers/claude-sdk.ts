/**
 * Claude provider via the Claude Agent SDK `query()` (in-process equivalent of
 * `claude -p`, same subscription auth). Neutralised into a one-shot completion:
 * a plain `systemPrompt` (no Claude Code preset), `allowedTools: []`,
 * `maxTurns: 1`, and `settingSources: []` so it never loads the repo's CLAUDE.md
 * or any project skills.
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import type { z } from "zod";
import type {
  LlmCallContext,
  LlmJsonResult,
  LlmProvider,
  LlmStreamChunk,
  LlmTextResult,
} from "../client";
import { extractJson } from "../extract-json";
import { cleanClaudeEnv } from "./claude-env";

export function claudeSdkProvider(ctx: LlmCallContext): LlmProvider {
  const cfg = ctx.config.claudeSdk ?? {
    chatModel: "sonnet",
    timeoutMs: 300_000,
  };

  async function call(
    system: string | undefined,
    prompt: string,
  ): Promise<{ text: string; usage: LlmTextResult["usage"] }> {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), cfg.timeoutMs);
    const started = Date.now();
    let text = "";
    let usage: LlmTextResult["usage"] = { durationMs: 0 };
    try {
      const q = query({
        prompt,
        options: {
          model: cfg.chatModel,
          ...(system ? { systemPrompt: system } : {}),
          allowedTools: [],
          maxTurns: 1,
          settingSources: [],
          abortController: abort,
          // Clean env so a nested run (app inside a Claude Code session) doesn't
          // couple to the parent session. No-op in normal deployment.
          env: cleanClaudeEnv(),
        },
      });
      for await (const msg of q) {
        if (msg.type !== "result") continue;
        if (msg.subtype !== "success") {
          throw new Error(`[claude_sdk] ${msg.subtype}`);
        }
        const m = msg as unknown as {
          result: string;
          total_cost_usd?: number;
          usage?: { input_tokens?: number; output_tokens?: number };
        };
        text = m.result ?? "";
        usage = {
          inputTokens: m.usage?.input_tokens,
          outputTokens: m.usage?.output_tokens,
          costCents: (m.total_cost_usd ?? 0) * 100,
          durationMs: Date.now() - started,
        };
      }
    } finally {
      clearTimeout(timer);
    }
    return { text, usage };
  }

  const provider: LlmProvider = {
    mode: "claude_sdk",
    model: cfg.chatModel,

    async generateText({ system, prompt }): Promise<LlmTextResult> {
      const { text, usage } = await call(system, prompt);
      return { text, provider: "claude_sdk", model: cfg.chatModel, usage };
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
      const jsonPrompt = `${prompt}\n\nRespond with ONLY valid JSON, no prose, no markdown fences.`;
      let last = await call(system, jsonPrompt);
      let parsed = schema.safeParse(safeJson(last.text));
      if (!parsed.success) {
        last = await call(
          system,
          `${jsonPrompt}\n\nYour previous answer was not valid JSON matching the schema. Output ONLY the JSON object.`,
        );
        parsed = schema.safeParse(safeJson(last.text));
      }
      if (!parsed.success) {
        throw new Error(
          `[claude_sdk] response did not match schema: ${JSON.stringify(parsed.error.issues).slice(0, 300)}`,
        );
      }
      return {
        data: parsed.data,
        provider: "claude_sdk",
        model: cfg.chatModel,
        usage: last.usage,
      };
    },

    async *streamText({ system, prompt }): AsyncIterable<LlmStreamChunk> {
      try {
        const { text } = await call(system, prompt);
        yield { type: "text", text };
        yield { type: "done" };
      } catch (e) {
        yield {
          type: "error",
          error: e instanceof Error ? e.message : String(e),
        };
      }
    },
  };
  return provider;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(extractJson(text));
  } catch {
    return null;
  }
}
