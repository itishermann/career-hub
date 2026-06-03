#!/usr/bin/env node
/**
 * Copies the typst.ts browser WASM modules into `public/typst/` so the live
 * template-editor preview can self-host them (no CDN dependency — consistent
 * with the self-hosted ethos of the app).
 *
 * Runs automatically via `predev` / `prebuild`. The files are gitignored
 * (the compiler wasm is ~27 MB); they are reproduced from node_modules on
 * every install/build.
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, "public", "typst");

const assets = [
  [
    "@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm",
    "typst_ts_web_compiler_bg.wasm",
  ],
  [
    "@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm",
    "typst_ts_renderer_bg.wasm",
  ],
];

mkdirSync(dest, { recursive: true });

for (const [from, to] of assets) {
  const src = join(root, "node_modules", from);
  const out = join(dest, to);
  if (!existsSync(src)) {
    console.warn(
      `[typst-wasm] missing ${from} — skipped (run \`bun install\`)`,
    );
    continue;
  }
  // Skip if already copied at the same size (cheap idempotency).
  if (existsSync(out) && statSync(out).size === statSync(src).size) continue;
  copyFileSync(src, out);
  console.log(
    `[typst-wasm] copied ${to} (${(statSync(src).size / 1e6).toFixed(1)} MB)`,
  );
}
