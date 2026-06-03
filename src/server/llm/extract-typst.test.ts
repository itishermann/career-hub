import { describe, expect, test } from "bun:test";
import { extractTypstFromLlm } from "./extract-typst";

describe("extractTypstFromLlm", () => {
  test("strips a ```typst fenced block (the observed qwen bug)", () => {
    const raw = '```typst\n#let a = 1\n#set page(paper: "a4")\n```';
    expect(extractTypstFromLlm(raw)).toBe('#let a = 1\n#set page(paper: "a4")');
  });

  test("strips a plain ``` fence with no language tag", () => {
    const raw = "```\n#heading[Hi]\n```";
    expect(extractTypstFromLlm(raw)).toBe("#heading[Hi]");
  });

  test("strips a ```typ fence (short alias)", () => {
    const raw = "```typ\n= Title\n```";
    expect(extractTypstFromLlm(raw)).toBe("= Title");
  });

  test("extracts the fenced block even with surrounding prose", () => {
    const raw =
      "Voici le code Typst :\n```typst\n#let x = 2\n```\nN’hésitez pas.";
    expect(extractTypstFromLlm(raw)).toBe("#let x = 2");
  });

  test("returns raw Typst untouched when there is no fence", () => {
    const raw = '// comment\n#set page(paper: "a4")\n= CV';
    expect(extractTypstFromLlm(raw)).toBe(
      '// comment\n#set page(paper: "a4")\n= CV',
    );
  });

  test("strips a truncated opening fence with no closing", () => {
    const raw = "```typst\n#let a = 1\n#let b = 2";
    expect(extractTypstFromLlm(raw)).toBe("#let a = 1\n#let b = 2");
  });

  test("trims leading/trailing whitespace", () => {
    expect(extractTypstFromLlm("\n\n  = Hello  \n\n")).toBe("= Hello");
  });

  test("empty input stays empty (the dead-generation guard handles it)", () => {
    expect(extractTypstFromLlm("")).toBe("");
    expect(extractTypstFromLlm("   \n  ")).toBe("");
  });
});
