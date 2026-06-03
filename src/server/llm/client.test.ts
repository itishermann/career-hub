import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { getLlmProvider, parseLlmConfig } from "./client";

describe("parseLlmConfig", () => {
  test("defaults to mock when shape is invalid", () => {
    expect(parseLlmConfig(null).mode).toBe("mock");
    expect(parseLlmConfig({ mode: "invalid" }).mode).toBe("mock");
    expect(parseLlmConfig({ mode: "anthropic" }).mode).toBe("anthropic");
  });
});

describe("mock provider", () => {
  test("generateText returns canned task-aware text", async () => {
    const provider = getLlmProvider({
      config: { mode: "mock" },
      task: "cv:typst:test",
    });
    const result = await provider.generateText({ prompt: "build a CV" });
    expect(result.provider).toBe("mock");
    expect(result.text.length).toBeGreaterThan(50);
    expect(result.text).toContain("set page");
  });

  test("generateJson returns shape that satisfies the schema", async () => {
    const provider = getLlmProvider({
      config: { mode: "mock" },
      task: "ats:keywords",
    });
    const schema = z.object({
      hard_skills: z.array(z.object({ keyword: z.string(), importance: z.number() })),
      soft_skills: z.array(z.object({ keyword: z.string(), importance: z.number() })),
      domain_keywords: z.array(z.object({ keyword: z.string(), importance: z.number() })),
      experience_signals: z.array(z.object({ keyword: z.string(), importance: z.number() })),
    });
    const result = await provider.generateJson({ prompt: "extract", schema });
    expect(result.data.hard_skills.length).toBeGreaterThan(0);
  });

  test("streamText yields chunks and a done event", async () => {
    const provider = getLlmProvider({ config: { mode: "mock" }, task: "cv:typst" });
    const chunks: string[] = [];
    let saw_done = false;
    for await (const chunk of provider.streamText({ prompt: "stream me" })) {
      if (chunk.type === "text" && chunk.text) chunks.push(chunk.text);
      if (chunk.type === "done") saw_done = true;
    }
    expect(chunks.length).toBeGreaterThan(0);
    expect(saw_done).toBe(true);
  });

  test("embed returns a 768-dim vector", async () => {
    const provider = getLlmProvider({ config: { mode: "mock" } });
    const embed = provider.embed!;
    const result = await embed({ text: "hello" });
    expect(result?.vector.length).toBe(768);
    expect(result?.model).toBe("mock-embed-768");
  });
});
