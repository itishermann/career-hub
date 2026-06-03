#!/bin/sh
# Runtime entrypoint: apply DB migrations, then start the server.
# Initial data seeding is a separate one-off (see docs / DECISIONS.md) to keep
# this image minimal.
set -e

echo "[entrypoint] applying database migrations…"
if ./node_modules/.bin/prisma migrate deploy; then
  echo "[entrypoint] migrations applied"
else
  echo "[entrypoint] WARNING: migrate deploy failed — starting anyway" >&2
fi

exec "$@"
