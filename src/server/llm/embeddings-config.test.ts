import { describe, expect, test } from "bun:test";
import { resolveEmbeddingsConfig } from "./client";

describe("resolveEmbeddingsConfig (decoupled embeddings)", () => {
  test("explicit embeddings block is used as-is", () => {
    const cfg = resolveEmbeddingsConfig({
      mode: "claude_sdk",
      embeddings: { provider: "ollama", endpoint: "http://x:11434/v1" },
    });
    expect(cfg.provider).toBe("ollama");
    expect(cfg.endpoint).toBe("http://x:11434/v1");
  });

  test("legacy local mode → derives ollama embeddings from local.*", () => {
    const cfg = resolveEmbeddingsConfig({
      mode: "local",
      local: {
        endpoint: "http://192.168.1.196:11434/v1",
        embeddingModel: "nomic-embed-text",
        embeddingDim: 768,
      },
    });
    expect(cfg.provider).toBe("ollama");
    expect(cfg.endpoint).toBe("http://192.168.1.196:11434/v1");
    expect(cfg.model).toBe("nomic-embed-text");
    expect(cfg.dim).toBe(768);
  });

  test("claude mode with no embeddings block → none (degraded RAG)", () => {
    expect(resolveEmbeddingsConfig({ mode: "claude_cli" }).provider).toBe(
      "none",
    );
  });

  test("explicit provider none is respected", () => {
    const cfg = resolveEmbeddingsConfig({
      mode: "local",
      local: { endpoint: "http://x:11434/v1" },
      embeddings: { provider: "none" },
    });
    expect(cfg.provider).toBe("none");
  });

  test("transformers provider stands alone (no endpoint needed)", () => {
    const cfg = resolveEmbeddingsConfig({
      mode: "claude_sdk",
      embeddings: { provider: "transformers" },
    });
    expect(cfg.provider).toBe("transformers");
    expect(cfg.transformersModel).toContain("nomic");
  });
});
