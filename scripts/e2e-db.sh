#!/usr/bin/env bash
# Bring up the ephemeral E2E Postgres, migrate and seed it.
# Idempotent: safe to re-run. Used by `bun run e2e` and by CI.
set -euo pipefail

cd "$(dirname "$0")/.."

export DATABASE_URL="${E2E_DATABASE_URL:-postgres://career:e2e_password@localhost:15433/career_hub}"

echo "[e2e-db] bringing up db-e2e container…"
docker compose -f docker-compose.e2e.yml up -d

echo "[e2e-db] waiting for Postgres (container health + host port)…"
ready=""
for _ in $(seq 1 60); do
  health="$(docker inspect --format '{{.State.Health.Status}}' career-hub-db-e2e-1 2>/dev/null || echo none)"
  if [ "$health" = "healthy" ] && nc -z localhost 15433 2>/dev/null; then
    echo "[e2e-db] Postgres ready"
    ready="yes"
    break
  fi
  sleep 1
done
if [ -z "$ready" ]; then
  echo "[e2e-db] ERROR: Postgres not ready in time" >&2
  docker compose -f docker-compose.e2e.yml logs db-e2e | tail -20 >&2
  exit 1
fi

echo "[e2e-db] applying migrations…"
DATABASE_URL="$DATABASE_URL" bunx prisma migrate deploy

echo "[e2e-db] seeding…"
DATABASE_URL="$DATABASE_URL" bun run prisma/seed.ts

echo "[e2e-db] done → $DATABASE_URL"
