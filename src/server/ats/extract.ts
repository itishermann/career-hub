/**
 * PDF text extraction for ATS scoring.
 *
 * Uses pdfjs-dist legacy build because we run in a Node/Bun context, not a
 * browser. When pdfjs cannot read the file or returns empty text, the
 * extraction is considered failed and the global ATS score collapses to 0
 * for that dimension (per CLAUDE.md section 9, étage 1).
 */

import { readFile } from "node:fs/promises";

export type AtsExtraction = {
  text: string;
  characterCount: number;
  pageCount: number;
  hasAccessibilityTags: boolean;
  ok: boolean;
  error?: string;
};

export async function extractPdfText(pdfPath: string): Promise<AtsExtraction> {
  try {
    const buf = await readFile(pdfPath);
    // Lazy-import the legacy build — pdfjs ships a heavy module that we'd
    // rather not load until ATS scoring is actually invoked.
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buf),
      useSystemFonts: false,
      disableFontFace: true,
      verbosity: 0,
    });
    const doc = await loadingTask.promise;
    const pageCount = doc.numPages;
    let text = "";
    for (let i = 1; i <= pageCount; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((it: unknown) => (typeof (it as { str: string }).str === "string" ? (it as { str: string }).str : ""))
        .join(" ");
      text += `${pageText}\n\n`;
    }
    const metadata = await doc.getMetadata().catch(() => null);
    const info = metadata?.info as Record<string, unknown> | undefined;
    const hasAccessibilityTags = !!info?.IsMarkedPDF;
    return {
      text,
      characterCount: text.length,
      pageCount,
      hasAccessibilityTags,
      ok: text.trim().length > 0,
    };
  } catch (err) {
    return {
      text: "",
      characterCount: 0,
      pageCount: 0,
      hasAccessibilityTags: false,
      ok: false,
      error: (err as Error).message,
    };
  }
}

/**
 * Fallback when no PDF is available: pull text out of the Typst source so we
 * can still score keywords and contextual quality. Heuristics that depend on
 * PDF structure (page count, PDF/UA tags) default to neutral values.
 */
export function extractTypstText(typstSource: string): AtsExtraction {
  const stripped = typstSource
    .replace(/#set [^]*?\n/g, " ")
    .replace(/#show [^]*?\n/g, " ")
    .replace(/#let [^]*?=[^\n]*\n/g, " ")
    .replace(/#[a-zA-Z][a-zA-Z0-9_]*\([^)]*\)/g, " ")
    .replace(/[#=*`_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return {
    text: stripped,
    characterCount: stripped.length,
    pageCount: 1,
    hasAccessibilityTags: false,
    ok: stripped.length > 0,
  };
}
