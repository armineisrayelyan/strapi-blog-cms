#!/usr/bin/env bash
# Migrate Strapi data from a local SQLite database to PostgreSQL (e.g. Neon).
#
# Prerequisites:
#   - Node 22 (nvm use)
#   - .tmp/data.db exists (your old SQLite database)
#   - .env configured for PostgreSQL (DATABASE_CLIENT=postgres, DATABASE_URL, etc.)
#   - npm install (better-sqlite3 is required only for the export step)
#
# Usage:
#   ./scripts/migrate-sqlite-to-postgres.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
EXPORT_FILE="data-export/sqlite-backup"
SQLITE_DB="${ROOT_DIR}/.tmp/data.db"

cd "$ROOT_DIR"

if [[ ! -f "$SQLITE_DB" ]]; then
  echo "Error: SQLite database not found at $SQLITE_DB"
  exit 1
fi

echo "==> Exporting from SQLite..."
mkdir -p data-export
env -u DATABASE_URL \
  DATABASE_CLIENT=sqlite \
  DATABASE_FILENAME=.tmp/data.db \
  npx strapi export --no-encrypt -f "$EXPORT_FILE"

echo ""
echo "==> Importing into PostgreSQL (this replaces existing Neon data)..."
npx strapi import -f "${EXPORT_FILE}.tar.gz" --force

echo ""
echo "Done. Start Strapi with: npm run develop"
