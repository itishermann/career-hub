/**
 * Typst compiler wrapper.
 *
 * Compiles Typst in-process via `@myriaddreamin/typst-ts-node-compiler`, a
 * native NAPI addon (Myriad-Dreamin/typst.ts). No external `typst` binary on
 * the PATH is required — platform-specific prebuilds are pulled as optional
 * dependencies. This produces tagged (PDF/UA-friendly) PDFs natively.
 *
 * If the native addon cannot load (unsupported platform / missing prebuild),
 * `compileTypst` returns a clear error in the result (rather than throwing) so
 * callers can degrade gracefully and still surface the Typst source.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { NodeCompiler } from "@myriaddreamin/typst-ts-node-compiler";
import { env } from "@/lib/env";

export type TypstCompileResult =
  | {
      ok: true;
      pdfPath: string;
      pdfBytes: Buffer;
      durationMs: number;
      sourcePath: string;
    }
  | { ok: false; error: string; sourcePath: string; durationMs: number };

export type TypstCompileInput = {
  /** Typst source code */
  source: string;
  /** Logical output file name (without extension). Used to derive the on-disk path. */
  outputName: string;
  /** Optional subdir under STORAGE_PATH. Defaults to "generations". */
  bucket?: string;
};

/**
 * Lazily-created compiler singleton. The native addon is expensive to spin up
 * and is safe to reuse across compilations (compile/pdf calls are synchronous).
 * Resolves to `null` once if the addon cannot be loaded, so `isTypstAvailable`
 * and `compileTypst` can degrade without retrying the import on every call.
 */
let compilerPromise: Promise<NodeCompiler | null> | undefined;

function getCompiler(): Promise<NodeCompiler | null> {
  if (!compilerPromise) {
    compilerPromise = (async () => {
      try {
        const mod = await import("@myriaddreamin/typst-ts-node-compiler");
        return mod.NodeCompiler.create();
      } catch (err) {
        console.error("[typst] native compiler unavailable:", err);
        return null;
      }
    })();
  }
  return compilerPromise;
}

export async function compileTypst(
  input: TypstCompileInput,
): Promise<TypstCompileResult> {
  const storageBase = resolve(env.STORAGE_PATH);
  const bucket = input.bucket ?? "generations";
  const dir = join(storageBase, bucket);
  const sourcePath = join(dir, `${input.outputName}.typ`);
  const pdfPath = join(dir, `${input.outputName}.pdf`);
  const startedAt = Date.now();

  // Persist the Typst source alongside the PDF (debug artifact + parity with
  // the previous subprocess contract that exposed `sourcePath`).
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(sourcePath, input.source, "utf8");
  } catch (err) {
    return {
      ok: false,
      error: `Failed to prepare typst source: ${(err as Error).message}`,
      sourcePath,
      durationMs: Date.now() - startedAt,
    };
  }

  const compiler = await getCompiler();
  if (!compiler) {
    return {
      ok: false,
      error:
        "Compilateur Typst natif indisponible (@myriaddreamin/typst-ts-node-compiler n'a pas pu se charger sur cette plateforme).",
      sourcePath,
      durationMs: Date.now() - startedAt,
    };
  }

  let pdfBytes: Buffer;
  try {
    const compiled = compiler.compile({ mainFileContent: input.source });
    const doc = compiled.result;
    if (!doc) {
      const diag = compiled.takeDiagnostics();
      const lines = (diag?.shortDiagnostics ?? []).map((d) =>
        typeof d === "string" ? d : (d?.message ?? JSON.stringify(d)),
      );
      const detail =
        lines.length > 0
          ? lines.join("\n").slice(0, 4000)
          : (diag?.compilationStatus ?? "diagnostics indisponibles");
      return {
        ok: false,
        error: `typst compile failed:\n${detail}`,
        sourcePath,
        durationMs: Date.now() - startedAt,
      };
    }
    // `pdfTags: true` emits a tagged PDF — the accessibility structure the ATS
    // extraction heuristics look for. We intentionally do NOT force the strict
    // `pdfStandard: "ua-1"` here: it hard-fails templates lacking required
    // metadata (document title/lang). Tagging gives the ATS benefit safely.
    pdfBytes = compiler.pdf(doc, { pdfTags: true });
  } catch (err) {
    return {
      ok: false,
      error: `typst compile error: ${(err as Error).message}`,
      sourcePath,
      durationMs: Date.now() - startedAt,
    };
  }

  try {
    await writeFile(pdfPath, pdfBytes);
  } catch (err) {
    return {
      ok: false,
      error: `typst produced a PDF but it could not be written: ${(err as Error).message}`,
      sourcePath,
      durationMs: Date.now() - startedAt,
    };
  }

  return {
    ok: true,
    pdfPath,
    pdfBytes,
    sourcePath,
    durationMs: Date.now() - startedAt,
  };
}

export async function isTypstAvailable(): Promise<boolean> {
  return (await getCompiler()) !== null;
}

// Re-export the storage base for callers (e.g. signed URL handlers).
export function storageBaseDir(): string {
  return resolve(env.STORAGE_PATH);
}

export function fileExistsUnderStorage(relativePath: string): string {
  return join(resolve(env.STORAGE_PATH), relativePath);
}

// Tiny helper kept here to avoid an extra util module — pathFor() returns the
// PDF path for a given generation id, used by the download route.
export function pdfPathForGeneration(id: string): string {
  return join(storageBaseDir(), "generations", `${id}.pdf`);
}

// Path helper for arbitrary buckets used in tests.
export function pathForBucket(
  bucket: string,
  name: string,
  ext: string,
): string {
  return join(storageBaseDir(), bucket, `${name}.${ext}`);
}
