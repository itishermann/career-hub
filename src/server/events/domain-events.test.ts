import { describe, expect, test } from "bun:test";
import { parseJobPayload } from "@/server/jobs/types";
import { translationDirection } from "./domain-events";

describe("translationDirection", () => {
  test("fr filled, en empty → fr→en", () => {
    expect(translationDirection({ fr: "Bonjour", en: null })).toEqual({
      source: "fr",
      target: "en",
    });
  });

  test("en filled, fr empty → en→fr", () => {
    expect(translationDirection({ fr: "", en: "Hello" })).toEqual({
      source: "en",
      target: "fr",
    });
  });

  test("both filled → null (no suggestion)", () => {
    expect(translationDirection({ fr: "Bonjour", en: "Hello" })).toBeNull();
  });

  test("both empty → null", () => {
    expect(translationDirection({ fr: null, en: "  " })).toBeNull();
  });
});

describe("TRANSLATION job payload", () => {
  test("valid payload parses", () => {
    const p = parseJobPayload("TRANSLATION", {
      entityType: "section",
      entityId: "s1",
      field: "contentMd",
      sourceLang: "fr",
      targetLang: "en",
    });
    expect(p.entityType).toBe("section");
    expect(p.targetLang).toBe("en");
  });

  test("rejects unknown entityType", () => {
    expect(() =>
      parseJobPayload("TRANSLATION", {
        entityType: "skill",
        entityId: "s1",
        field: "name",
        sourceLang: "fr",
        targetLang: "en",
      }),
    ).toThrow();
  });

  test("rejects missing field", () => {
    expect(() =>
      parseJobPayload("TRANSLATION", {
        entityType: "project",
        entityId: "p1",
        sourceLang: "fr",
        targetLang: "en",
      }),
    ).toThrow();
  });
});
