#!/usr/bin/env bash
# Run on the VPS after `git pull` to apply schema + restore data from prisma/seed-data.json
set -euo pipefail

if [ ! -f .env ]; then
  echo "Missing .env — set DATABASE_URL to your VPS MySQL database first."
  exit 1
fi

if [ ! -f prisma/seed-data.json ]; then
  echo "Missing prisma/seed-data.json — run npm run db:export-seed on your local machine before pushing."
  exit 1
fi

echo "Applying migrations..."
npx prisma migrate deploy

echo "Seeding database from prisma/seed-data.json..."
npx prisma db seed

echo "Database setup complete."
