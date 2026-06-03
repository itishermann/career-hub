/**
 * Extract compilable Typst source from a raw LLM response.
 *
 * Some models (observed: qwen2.5-coder via Ollama) ignore the "no backticks"
 * instruction and wrap their output in a markdown code fence (```typst … ```).
 * Passing that fence straight to the Typst compiler makes Typst render the
 * fenced content as a literal *raw block* — the PDF then shows the source code
 * verbatim instead of a compiled document. This helper strips the fence (and
 * any surrounding prose) so only the Typst body reaches the compiler.
 *
 * Note: if the Typst body itself contained a ``` raw block the non-greedy match
 * could cut it short, but CV/cover-letter templates never emit raw code blocks,
 * so this is safe in practice.
 */
export function extractTypstFromLlm(raw: string): string {
  const text = raw.trim();
  if (text.length === 0) return "";

  // Prefer the first complete fenced block (```typst / ```typ / ``` ).
  const fence = /```(?:typst|typ)?[^\n]*\n([\s\S]*?)```/i.exec(text);
  if (fence) {
    return fence[1].trim();
  }

  // Opening fence but no closing one (truncated output): strip the markers.
  if (text.startsWith("```")) {
    return text
      .replace(/^```[^\n]*\n?/, "")
      .replace(/```\s*$/, "")
      .trim();
  }

  return text;
}
