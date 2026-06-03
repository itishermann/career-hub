/**
 * Claude provider via the local `claude -p` CLI (subscription auth, no API key).
 *
 * `claude -p` is an AGENT, not a completion endpoint — so we neutralise it into
 * a one-shot text generator: no tools (`--disallowedTools "*"`), no agentic
 * preamble (`--exclude-dynamic-system-prompt-sections`), JSON envelope output
 * (`--output-format json`) for usage/cost, and the prompt piped via stdin (no
 * shell injection, no argv limits).
 */

import { spawn } from "node:child_process";
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

type ClaudeEnvelope = {
  result: string;
  is_error?: boolean;
  usage?: { input_tokens?: number; output_tokens?: number };
  total_cost_usd?: number;
};

function runClaude(
  bin: string,
  args: string[],
  stdin: string,
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: cleanClaudeEnv() as NodeJS.ProcessEnv,
    });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`[claude_cli] timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stdout.on("data", (d) => {
      out += d;
    });
    child.stderr.on("data", (d) => {
      err += d;
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(
        new Error(
          `[claude_cli] failed to spawn "${bin}" (is the CLI installed + on PATH?): ${e.message}`,
        ),
      );
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out);
      else reject(new Error(`[claude_cli] exit ${code}: ${err.slice(0, 300)}`));
    });
    child.stdin.end(stdin);
  });
}

export function claudeCliProvider(ctx: LlmCallContext): LlmProvider {
  const cfg = ctx.config.claudeCli ?? {
    binPath: "claude",
    chatModel: "sonnet",
    timeoutMs: 300_000,
  };

  function baseArgs(system?: string): string[] {
    const args = [
      "-p",
      "--output-format",
      "json",
      "--model",
      cfg.chatModel,
      "--exclude-dynamic-system-prompt-sections",
      "--disallowedTools",
      "*",
    ];
    if (system) args.push("--system-prompt", system);
    return args;
  }

  async function call(
    system: string | undefined,
    prompt: string,
  ): Promise<{ text: string; usage: LlmTextResult["usage"] }> {
    const started = Date.now();
    const raw = await runClaude(
      cfg.binPath,
      baseArgs(system),
      prompt,
      cfg.timeoutMs,
    );
    let env: ClaudeEnvelope;
    try {
      env = JSON.parse(raw) as ClaudeEnvelope;
    } catch {
      throw new Error(
        `[claude_cli] could not parse CLI JSON output: ${raw.slice(0, 200)}`,
      );
    }
    if (env.is_error) {
      throw new Error(`[claude_cli] ${env.result ?? "unknown error"}`);
    }
    return {
      text: env.result ?? "",
      usage: {
        inputTokens: env.usage?.input_tokens,
        outputTokens: env.usage?.output_tokens,
        costCents: (env.total_cost_usd ?? 0) * 100,
        durationMs: Date.now() - started,
      },
    };
  }

  const provider: LlmProvider = {
    mode: "claude_cli",
    model: cfg.chatModel,

    async generateText({ system, prompt }): Promise<LlmTextResult> {
      const { text, usage } = await call(system, prompt);
      return { text, provider: "claude_cli", model: cfg.chatModel, usage };
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
        // One retry with a stricter instruction.
        last = await call(
          system,
          `${jsonPrompt}\n\nYour previous answer was not valid JSON matching the schema. Output ONLY the JSON object.`,
        );
        parsed = schema.safeParse(safeJson(last.text));
      }
      if (!parsed.success) {
        throw new Error(
          `[claude_cli] response did not match schema: ${JSON.stringify(parsed.error.issues).slice(0, 300)}`,
        );
      }
      return {
        data: parsed.data,
        provider: "claude_cli",
        model: cfg.chatModel,
        usage: last.usage,
      };
    },

    async *streamText({ system, prompt }): AsyncIterable<LlmStreamChunk> {
      // The CLI JSON mode is one-shot; emit the full text then done.
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
