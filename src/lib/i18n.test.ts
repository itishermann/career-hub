import { describe, expect, test } from "bun:test";
import {
  emptyLocalized,
  isLocalizedFilled,
  mergeLocalized,
  pickLocalized,
  pickLocalizedArray,
} from "./i18n";

describe("pickLocalized", () => {
  test("returns the preferred locale when filled", () => {
    expect(pickLocalized({ fr: "salut", en: "hi" }, "fr")).toBe("salut");
    expect(pickLocalized({ fr: "salut", en: "hi" }, "en")).toBe("hi");
  });

  test("falls back to the other locale by default when preferred is empty", () => {
    expect(pickLocalized({ fr: null, en: "hi" }, "fr")).toBe("hi");
    expect(pickLocalized({ fr: "salut", en: "" }, "en")).toBe("salut");
  });

  test("returns null when both locales are empty", () => {
    expect(pickLocalized({ fr: null, en: null }, "fr")).toBeNull();
  });

  test("does not fall back when fallback is null", () => {
    expect(pickLocalized({ fr: null, en: "hi" }, "fr", { fallback: null })).toBeNull();
  });

  test("returns null on null input", () => {
    expect(pickLocalized(null, "fr")).toBeNull();
    expect(pickLocalized(undefined, "fr")).toBeNull();
  });
});

describe("pickLocalizedArray", () => {
  test("returns preferred array when populated", () => {
    expect(pickLocalizedArray({ fr: ["a"], en: ["b"] }, "fr")).toEqual(["a"]);
  });

  test("falls back when preferred is empty", () => {
    expect(pickLocalizedArray({ fr: [], en: ["b"] }, "fr")).toEqual(["b"]);
    expect(pickLocalizedArray({ fr: null, en: ["b"] }, "fr")).toEqual(["b"]);
  });

  test("returns empty array on missing data", () => {
    expect(pickLocalizedArray(null, "fr")).toEqual([]);
  });
});

describe("isLocalizedFilled", () => {
  test("recognises filled values", () => {
    expect(isLocalizedFilled({ fr: "salut", en: null }, "fr")).toBe(true);
    expect(isLocalizedFilled({ fr: "salut", en: null }, "en")).toBe(false);
    expect(isLocalizedFilled({ fr: "   ", en: null }, "fr")).toBe(false);
    expect(isLocalizedFilled(null, "fr")).toBe(false);
  });
});

describe("mergeLocalized", () => {
  test("merges patch onto existing", () => {
    expect(mergeLocalized({ fr: "a", en: "b" }, { en: "B" })).toEqual({ fr: "a", en: "B" });
  });

  test("treats undefined as no-op", () => {
    expect(mergeLocalized({ fr: "a", en: "b" }, {})).toEqual({ fr: "a", en: "b" });
  });

  test("allows explicit null to clear", () => {
    expect(mergeLocalized({ fr: "a", en: "b" }, { en: null })).toEqual({ fr: "a", en: null });
  });

  test("works against null existing", () => {
    expect(mergeLocalized(null, { fr: "x" })).toEqual({ fr: "x", en: null });
  });
});

describe("emptyLocalized", () => {
  test("returns the null-pair", () => {
    expect(emptyLocalized()).toEqual({ fr: null, en: null });
  });
});
