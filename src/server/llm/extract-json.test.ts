import { describe, expect, test } from "bun:test";
import { extractJson } from "./extract-json";

describe("extractJson", () => {
  test("returns clean JSON untouched", () => {
    expect(JSON.parse(extractJson('{"a":1}'))).toEqual({ a: 1 });
  });

  test("strips a ```json fence", () => {
    const raw = '```json\n{"a":1,"b":[2,3]}\n```';
    expect(JSON.parse(extractJson(raw))).toEqual({ a: 1, b: [2, 3] });
  });

  test("extracts object embedded in prose", () => {
    const raw = 'Here is the result:\n{"ok":true}\nHope this helps!';
    expect(JSON.parse(extractJson(raw))).toEqual({ ok: true });
  });

  test("extracts a top-level array", () => {
    const raw = "Sure: [1, 2, 3]";
    expect(JSON.parse(extractJson(raw))).toEqual([1, 2, 3]);
  });

  test("handles braces inside strings", () => {
    const raw = 'prefix {"text":"a } b","n":1} suffix';
    expect(JSON.parse(extractJson(raw))).toEqual({ text: "a } b", n: 1 });
  });

  test("handles nested objects", () => {
    const raw = '{"a":{"b":{"c":1}},"d":2} trailing';
    expect(JSON.parse(extractJson(raw))).toEqual({ a: { b: { c: 1 } }, d: 2 });
  });
});
