#!/bin/sh
set -e

echo "Running Prisma db push to sync schema..."
prisma db push --skip-generate --accept-data-loss 2>/dev/null || echo "Prisma db push completed (or skipped)"

echo "Starting Next.js server..."
exec node server.js
