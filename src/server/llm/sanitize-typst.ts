/**
 * Deterministic repair pass for LLM-generated Typst.
 *
 * In Typst markup, `#` is the sigil that enters *code mode*. A literal `#` in
 * prose (the classic `C#`, `F#`, `n°#1`, "the # symbol") is therefore parsed
 * as the start of an expression and breaks compilation with
 * `expected expression` when no valid expression follows. Small models do not
 * reliably escape it despite explicit prompt instructions, so we repair it
 * deterministically before handing the source to the compiler.
 *
 * Safety is the whole game here: the template body is full of *intentional*
 * `#` (`#let`, `#set`, `#text`, `#link`, …). Blindly escaping every `#` would
 * destroy the document. We only escape a `#` that cannot be valid code:
 *
 *   1. it is glued to a preceding alphanumeric (`C#`) — Typst never has
 *      `identifier#` as valid code, so this is always literal; or
 *   2. the following character cannot start a Typst expression (`# `, `#1`,
 *      end of input) — which would be a parse error as code anyway, so the
 *      only sane recovery is to treat it as a literal.
 *
 * A `#` that legitimately opens code (`#let`, `#(`, `#{`, `#[`, preceded by
 * whitespace/line-start) matches neither rule and is left untouched.
 *
 * We never touch characters inside string literals, line comments, block
 * comments or backtick-delimited raw blocks: a URL fragment like
 * `#link("https://x/page#sec")` must survive verbatim.
 */

/** Characters that can legally begin a Typst expression after `#`. */
function canStartExpression(ch: string | undefined): boolean {
  if (ch === undefined) return false;
  // Identifiers (incl. non-ASCII letters), and the three grouping openers.
  if (ch === "(" || ch === "{" || ch === "[") return true;
  if (ch === "_") return true;
  // Letter (Unicode-aware). Typst identifiers may contain non-ASCII letters.
  return /\p{L}/u.test(ch);
}

function isAlnum(ch: string | undefined): boolean {
  if (ch === undefined) return false;
  return /[\p{L}\p{N}]/u.test(ch);
}

/**
 * Escape literal `#` that would otherwise break Typst parsing, while skipping
 * strings, comments and raw blocks. Idempotent: an already-escaped `\#` is
 * left as-is.
 */
export function sanitizeTypst(source: string): string {
  let out = "";
  let i = 0;
  const n = source.length;

  // Lexical-context flags. We track just enough to avoid editing inside spans
  // where `#` is data, never code.
  while (i < n) {
    const ch = source[i];
    const next = source[i + 1];

    // Escaped char in markup (`\#`, `\@`, …): copy the pair verbatim.
    if (ch === "\\") {
      out += ch + (next ?? "");
      i += 2;
      continue;
    }

    // String literal: copy until the unescaped closing quote.
    if (ch === '"') {
      out += ch;
      i++;
      while (i < n) {
        const c = source[i];
        out += c;
        i++;
        if (c === "\\" && i < n) {
          out += source[i];
          i++;
          continue;
        }
        if (c === '"') break;
      }
      continue;
    }

    // Line comment: copy to end of line.
    if (ch === "/" && next === "/") {
      while (i < n && source[i] !== "\n") {
        out += source[i];
        i++;
      }
      continue;
    }

    // Block comment: copy to closing */.
    if (ch === "/" && next === "*") {
      out += "/*";
      i += 2;
      while (i < n && !(source[i] === "*" && source[i + 1] === "/")) {
        out += source[i];
        i++;
      }
      if (i < n) {
        out += "*/";
        i += 2;
      }
      continue;
    }

    // Raw block / inline raw: copy the backtick-delimited span verbatim.
    if (ch === "`") {
      out += ch;
      i++;
      while (i < n) {
        out += source[i];
        if (source[i] === "`") {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    // The hot path: a `#` in markup/code context.
    if (ch === "#") {
      const prev = source[i - 1];
      const literal = isAlnum(prev) || !canStartExpression(next);
      out += literal ? "\\#" : "#";
      i++;
      continue;
    }

    out += ch;
    i++;
  }

  return out;
}
