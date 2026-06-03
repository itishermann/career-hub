import { describe, expect, test } from "bun:test";
import { sanitizeTypst } from "./sanitize-typst";

describe("sanitizeTypst — escapes literal # that breaks parsing", () => {
  test("escapes C# glued to a letter (the observed haiku bug)", () => {
    expect(sanitizeTypst("Python, C#")).toBe("Python, C\\#");
  });

  test("escapes F# and other language names", () => {
    expect(sanitizeTypst("F#, C#, .NET")).toBe("F\\#, C\\#, .NET");
  });

  test("escapes a lone # followed by a space", () => {
    expect(sanitizeTypst("the # symbol")).toBe("the \\# symbol");
  });

  test("escapes # followed by a digit (#1 is not valid Typst code)", () => {
    expect(sanitizeTypst("n°#1 priority")).toBe("n°\\#1 priority");
  });

  test("escapes a trailing # at end of input", () => {
    expect(sanitizeTypst("grade A#")).toBe("grade A\\#");
  });
});

describe("sanitizeTypst — leaves legitimate Typst code untouched", () => {
  test("does not touch #let / #set / #show", () => {
    const src = '#let x = 1\n#set page(paper: "a4")\n#show heading: it => it';
    expect(sanitizeTypst(src)).toBe(src);
  });

  test("does not touch #text(...)[...] calls", () => {
    const src = "#text(weight: 700)[Jean Dupont]";
    expect(sanitizeTypst(src)).toBe(src);
  });

  test("does not touch code/content/group openers #( #{ #[", () => {
    expect(sanitizeTypst("#(1 + 2)")).toBe("#(1 + 2)");
    expect(sanitizeTypst("#{ let a = 1 }")).toBe("#{ let a = 1 }");
    expect(sanitizeTypst("#[content]")).toBe("#[content]");
  });

  test("does not corrupt a # inside a string literal (URL fragment)", () => {
    const src = '#link("https://x.com/page#section")[link]';
    expect(sanitizeTypst(src)).toBe(src);
  });

  test("does not corrupt a # inside an inline raw span", () => {
    const src = "`git commit #123`";
    expect(sanitizeTypst(src)).toBe(src);
  });

  test("does not corrupt a # inside a line comment", () => {
    const src = "// issue #42\n#let a = 1";
    expect(sanitizeTypst(src)).toBe(src);
  });

  test("leaves an already-escaped \\# alone (idempotent)", () => {
    expect(sanitizeTypst("C\\#")).toBe("C\\#");
    expect(sanitizeTypst(sanitizeTypst("Python, C#"))).toBe("Python, C\\#");
  });

  test("preserves an escaped email \\@ and surrounding link", () => {
    const src = '#link("mailto:a@b.com")[a\\@b.com]';
    expect(sanitizeTypst(src)).toBe(src);
  });
});

describe("sanitizeTypst — the real broken generation compiles after repair", () => {
  test("repairs the skills line that contained C#", () => {
    const line =
      "React, Next.js, Express, NestJS · TypeScript, JavaScript, Python, C#";
    expect(sanitizeTypst(line)).toBe(
      "React, Next.js, Express, NestJS · TypeScript, JavaScript, Python, C\\#",
    );
  });
});
