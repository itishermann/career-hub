import { describe, expect, test } from "bun:test";
import { JOB_PAYLOAD_SCHEMAS, parseJobPayload } from "./types";

describe("job payload schemas", () => {
  test("valid CV payload parses", () => {
    const p = parseJobPayload("CV_GENERATION", {
      templateName: "sobre-fr",
      campaignId: "c1",
      language: "fr",
    });
    expect(p.templateName).toBe("sobre-fr");
  });

  test("CV payload without templateName throws", () => {
    expect(() => parseJobPayload("CV_GENERATION", {})).toThrow();
  });

  test("LM payload requires campaignId", () => {
    expect(() =>
      parseJobPayload("LM_GENERATION", { templateName: "x" }),
    ).toThrow();
  });

  test("FACT_EXTRACTION requires journalEntryId", () => {
    const p = parseJobPayload("FACT_EXTRACTION", { journalEntryId: "e1" });
    expect(p.journalEntryId).toBe("e1");
  });

  test("ATS_SCORING requires generationId", () => {
    const p = parseJobPayload("ATS_SCORING", { generationId: "g1" });
    expect(p.generationId).toBe("g1");
  });

  test("every JobType has a schema", () => {
    for (const t of [
      "CV_GENERATION",
      "LM_GENERATION",
      "FACT_EXTRACTION",
      "ATS_SCORING",
    ] as const) {
      expect(JOB_PAYLOAD_SCHEMAS[t]).toBeDefined();
    }
  });
});
