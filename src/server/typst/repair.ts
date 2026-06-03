/**
 * Compile Typst with automatic repair.
 *
 * A two-stage recovery used by both the user-triggered recompile action
 * (actions/generations.ts) and the CV improvement loop
 * (jobs/handlers/cv-improvement.ts), so the repair contract lives in one place:
 *
 *   1. Deterministic: run the source through `sanitizeTypst` and compile. This
 *      alone fixes the common literal-`#` break (e.g. `C#`) at zero LLM cost.
 *   2. If still failing, up to `maxLlmRepairs` LLM passes that receive the
 *      broken source + the compiler diagnostic and return a corrected version,
 *      re-sanitized and recompiled each time.
 *
 * Callers own persistence and the `isTypstAvailable()` precheck. This helper is
 * pure I/O orchestration: it never touches the database.
 */

import { getLlmProviderForUser } from "@/server/llm/client";
import { extractTypstFromLlm } from "@/server/llm/extract-typst";
import { sanitizeTypst } from "@/server/llm/sanitize-typst";
import { compileTypst } from "@/server/typst/compile";

export const TYPST_REPAIR_SYSTEM = `Tu es un outil de réparation de code Typst. On te fournit du code Typst qui échoue à la compilation et le diagnostic exact du compilateur.

- Tu renvoies UNIQUEMENT le code Typst corrigé, prêt à compiler. Pas de fence Markdown, pas d'explication, pas de préface.
- Tu corriges la cause de l'erreur en préservant l'intégralité du contenu et de la mise en page. Tu ne réécris pas le document, tu le répares.
- Caractères littéraux à échapper avec un antislash quand ils apparaissent dans le texte : \`#\`, \`@\`, \`$\`, \`<\`, \`>\`. Un \`#\` non échappé démarre une expression et casse la compilation (ex: \`C#\` → \`C\\#\`).`;

export const DEFAULT_MAX_LLM_REPAIRS = 2;

export type CompileWithRepairResult =
  | { ok: true; pdfPath: string; typstSource: string; usedLlmRepair: boolean }
  | { ok: false; error: string; typstSource: string };

export async function compileWithRepair(input: {
  /** Typst source to compile (sanitisation is applied internally). */
  source: string;
  outputName: string;
  rawLlmConfig: unknown;
  language: string;
  /** Compiler output bucket; defaults to "generations". */
  bucket?: string;
  maxLlmRepairs?: number;
}): Promise<CompileWithRepairResult> {
  const maxLlmRepairs = input.maxLlmRepairs ?? DEFAULT_MAX_LLM_REPAIRS;
  const bucket = input.bucket ?? "generations";

  let candidate = sanitizeTypst(input.source);
  let lastError = "";

  for (let attempt = 0; attempt <= maxLlmRepairs; attempt++) {
    const result = await compileTypst({
      source: candidate,
      outputName: input.outputName,
      bucket,
    });

    if (result.ok) {
      return {
        ok: true,
        pdfPath: result.pdfPath,
        typstSource: candidate,
        usedLlmRepair: attempt > 0,
      };
    }

    lastError = result.error;
    // Out of LLM budget: give up with the diagnostic and last source tried.
    if (attempt === maxLlmRepairs) break;

    // Ask the active provider to repair the source given the diagnostic.
    const provider = getLlmProviderForUser(
      input.rawLlmConfig,
      `typst:repair:${input.language}`,
    );
    const repairPrompt = `<diagnostic>\n${result.error.slice(0, 2000)}\n</diagnostic>\n\n<typst_source>\n${candidate}\n</typst_source>\n\nRenvoie le code Typst corrigé, prêt à compiler. Aucun autre texte.`;
    const llm = await provider.generateText({
      system: TYPST_REPAIR_SYSTEM,
      prompt: repairPrompt,
    });
    const repaired = sanitizeTypst(extractTypstFromLlm(llm.text));
    if (repaired.trim().length === 0) break;
    candidate = repaired;
  }

  return { ok: false, error: lastError, typstSource: candidate };
}
