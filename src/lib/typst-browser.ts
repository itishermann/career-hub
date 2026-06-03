/**
 * Browser-side Typst rendering via the all-in-one typst.ts (`$typst`).
 *
 * Used for the live template-editor preview (compile + render to SVG entirely
 * client-side — no server round-trip). The WASM modules are self-hosted under
 * `/public/typst/` (copied from node_modules by scripts/copy-typst-wasm.mjs).
 *
 * The authoritative artifact remains the server-compiled tagged PDF (see
 * src/server/typst/compile.ts); this SVG path is for fast preview only and may
 * differ slightly in font fallback.
 *
 * The package is imported dynamically so it never loads during SSR (it touches
 * browser globals). The 27 MB compiler wasm is fetched lazily on first render.
 */

type TypstModule = typeof import("@myriaddreamin/typst.ts");

let modulePromise: Promise<TypstModule> | null = null;

function loadTypst(): Promise<TypstModule> {
  if (!modulePromise) {
    modulePromise = (async () => {
      const mod = await import("@myriaddreamin/typst.ts");
      mod.$typst.setCompilerInitOptions({
        getModule: () => "/typst/typst_ts_web_compiler_bg.wasm",
      });
      mod.$typst.setRendererInitOptions({
        getModule: () => "/typst/typst_ts_renderer_bg.wasm",
      });
      return mod;
    })();
  }
  return modulePromise;
}

/** Compile + render a Typst source string to an SVG string. Throws on diagnostics. */
export async function renderTypstSvg(source: string): Promise<string> {
  const { $typst } = await loadTypst();
  return $typst.svg({ mainContent: source });
}
