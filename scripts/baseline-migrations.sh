#!/usr/bin/env bash
# One-time baseline for VPS databases that already have tables but no _prisma_migrations history.
# After this, `npx prisma migrate deploy` works for new migrations only.
set -euo pipefail

if [ ! -f .env ]; then
  echo "Missing .env — set DATABASE_URL first."
  exit 1
fi

echo "Marking all existing migrations as already applied (baseline)..."
for dir in prisma/migrations/*/; do
  name=$(basename "$dir")
  echo "  -> $name"
  npx prisma migrate resolve --applied "$name"
done

echo ""
echo "Baseline complete. New schema changes: npx prisma migrate deploy"
