import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactCompiler: true,
  // NOTE: `output: "standalone"` is intentionally NOT used — Next 16.2.6 crashes
  // finalizing standalone when a next-intl `proxy.ts` is present (it renames a
  // never-generated proxy.js.nft.json). The Docker image ships pruned prod
  // node_modules + `next start` instead (see Dockerfile / BLOCKERS.md).
  // Native NAPI addon — must stay external so the bundler does not try to
  // pack the platform-specific `.node` binary into the server bundle.
  serverExternalPackages: [
    "@myriaddreamin/typst-ts-node-compiler",
    // transformers.js + its native onnxruntime backend (in-process embeddings).
    "@huggingface/transformers",
    "onnxruntime-node",
    // structured logger (dynamic requires / transports trip the bundler).
    "pino",
  ],
  experimental: {
    optimizePackageImports: ["@mantine/core", "@mantine/hooks", "lucide-react"],
  },
};

export default withNextIntl(nextConfig);
