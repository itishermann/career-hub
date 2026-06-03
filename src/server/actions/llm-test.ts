"use server";

import { z } from "zod";
import { requireUser } from "@/server/auth-helpers";

const TestInput = z.object({
  endpoint: z.string().url(),
  apiKey: z.string().optional(),
  embeddingModel: z.string().min(1),
  embeddingDim: z.number().int().positive(),
});

export type LocalConnTestResult = {
  ok: boolean;
  models: string[];
  detectedDim?: number;
  error?: string;
};

/**
 * Probe a local OpenAI-compatible endpoint: list models and verify the
 * embedding dimension matches the configured value (which must match the fixed
 * pgvector column). Runs server-side so it can reach a LAN address.
 *
 * Note: this intentionally fetches a user-supplied URL — that's the whole point
 * of a self-hosted LLM endpoint. It's gated to the authenticated owner.
 */
export async function testLocalConnection(
  raw: z.infer<typeof TestInput>,
): Promise<LocalConnTestResult> {
  await requireUser();
  const cfg = TestInput.parse(raw);
  const base = cfg.endpoint.replace(/\/+$/, "");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (cfg.apiKey && cfg.apiKey.length > 0)
    headers.Authorization = `Bearer ${cfg.apiKey}`;

  try {
    const modelsRes = await fetch(`${base}/models`, {
      headers,
      signal: AbortSignal.timeout(8000),
    });
    if (!modelsRes.ok) {
      return {
        ok: false,
        models: [],
        error: `GET /models → HTTP ${modelsRes.status}`,
      };
    }
    const modelsJson = (await modelsRes.json()) as { data?: { id: string }[] };
    const models = Array.isArray(modelsJson.data)
      ? modelsJson.data.map((m) => m.id)
      : [];

    const embRes = await fetch(`${base}/embeddings`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: cfg.embeddingModel,
        input: "career-hub connection test",
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!embRes.ok) {
      return {
        ok: false,
        models,
        error: `POST /embeddings → HTTP ${embRes.status}`,
      };
    }
    const embJson = (await embRes.json()) as {
      data?: { embedding?: number[] }[];
    };
    const vec = embJson.data?.[0]?.embedding;
    const detectedDim = Array.isArray(vec) ? vec.length : undefined;
    const dimOk = detectedDim === cfg.embeddingDim;

    return {
      ok: dimOk,
      models,
      detectedDim,
      error: dimOk
        ? undefined
        : `Dimension détectée ${detectedDim ?? "?"} ≠ configurée ${cfg.embeddingDim}. Ajuste la dim (la colonne pgvector est figée).`,
    };
  } catch (err) {
    return {
      ok: false,
      models: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
