import { describe, expect, test } from "bun:test";
import { toVectorLiteral } from "./pgvector";

describe("toVectorLiteral", () => {
  test("formats a vector as pgvector text input", () => {
    expect(toVectorLiteral([1, 2, 3])).toBe("[1,2,3]");
  });

  test("handles floats and negatives", () => {
    expect(toVectorLiteral([0.5, -0.25, 0])).toBe("[0.5,-0.25,0]");
  });

  test("handles an empty vector", () => {
    expect(toVectorLiteral([])).toBe("[]");
  });

  test("preserves order", () => {
    const v = Array.from({ length: 5 }, (_, i) => i / 10);
    expect(toVectorLiteral(v)).toBe("[0,0.1,0.2,0.3,0.4]");
  });
});
