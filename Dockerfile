# syntax=docker/dockerfile:1
#
# Multi-stage build. Dependencies are installed with Bun (the project's package
# manager + lockfile); the Next.js build and runtime use Node (the app uses no
# Bun-specific runtime APIs). `next start` is used rather than `output:
# standalone` — the latter crashes on Next 16.2.6 with a next-intl proxy
# (see BLOCKERS.md). Image is kept lean via a production-only dependency stage.

# ---------------------------------------------------------------------------
# deps — full deps (incl. dev) for building
# ---------------------------------------------------------------------------
FROM oven/bun:1.3-slim AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---------------------------------------------------------------------------
# prod-deps — production-only deps for the runtime image
# ---------------------------------------------------------------------------
FROM oven/bun:1.3-slim AS prod-deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# ---------------------------------------------------------------------------
# builder — prisma generate + Next build (under Node)
# ---------------------------------------------------------------------------
FROM node:22-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# DATABASE_URL only needs to be set so prisma.config.ts loads; neither generate
# nor the build connect (force-dynamic pages → no build-time DB access).
ENV DATABASE_URL="postgres://build:build@localhost:5432/build"
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN node scripts/copy-typst-wasm.mjs \
 && ./node_modules/.bin/prisma generate \
 && NEXT_PHASE=phase-production-build NODE_ENV=production ./node_modules/.bin/next build

# ---------------------------------------------------------------------------
# runner — minimal Node runtime (next start)
# ---------------------------------------------------------------------------
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Production node_modules, then overlay the generated Prisma client.
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Build output + assets + the bits next start / migrations / i18n need at runtime.
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/i18n ./src/i18n
COPY --from=builder /app/messages ./messages
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# Trim weight that the server runtime never uses:
#  - the browser-only Typst web-compiler (its wasm is already served from public/)
#  - non-glibc / non-target prebuilt native binaries (the image is glibc Linux)
RUN rm -rf \
      node_modules/@myriaddreamin/typst-ts-web-compiler \
      node_modules/@myriaddreamin/typst-ts-node-compiler-*-musl \
      node_modules/@next/swc-*-musl \
      node_modules/@next/swc-darwin-* \
      node_modules/@next/swc-win32-* \
  ; chmod +x docker-entrypoint.sh && chown -R node:node /app
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["./node_modules/.bin/next", "start"]
