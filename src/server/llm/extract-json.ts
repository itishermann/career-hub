/**
 * Extract a JSON value from a conversational LLM response.
 *
 * Chat-style models (Claude, local chat models) often wrap JSON in prose or a
 * markdown code fence. This pulls out the first balanced object/array so it can
 * be JSON.parsed. Used by the Claude providers' generateJson().
 */
export function extractJson(raw: string): string {
  let text = raw.trim();

  // Prefer a fenced ```json block if present.
  const fence = /```(?:json)?\s*\n?([\s\S]*?)```/i.exec(text);
  if (fence) text = fence[1].trim();

  // If it already parses, return as-is.
  try {
    JSON.parse(text);
    return text;
  } catch {
    /* fall through to balanced extraction */
  }

  // Find the first balanced {...} or [...] (string-aware).
  const start = text.search(/[[{]/);
  if (start === -1) return text;
  const open = text[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return text.slice(start);
}
