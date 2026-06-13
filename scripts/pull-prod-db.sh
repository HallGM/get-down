#!/usr/bin/env bash
set -euo pipefail

# Replaces the local development database with a fresh dump of production.
# Useful for testing migration and repair scripts against real data before
# running them on production.
#
# Requirements:
#   - Local Docker DB running (pnpm dev, or: docker compose up -d db)
#   - The local API server stopped (it holds connections to the DB)
#   - pg_dump installed locally  OR  Docker available (auto-fallback on version mismatch)
#
# Usage:
#   RENDER_DATABASE_URL="postgresql://..." ./scripts/pull-prod-db.sh
#
# Get RENDER_DATABASE_URL from:
#   Render dashboard -> your Postgres database -> Info tab -> External Database URL

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

LOCAL_CONTAINER="get-down-db"
LOCAL_USER="postgres"
LOCAL_DB="get_down"

# ── Validate ──────────────────────────────────────────────────────────────────

if [[ -z "${RENDER_DATABASE_URL:-}" ]]; then
  echo "Error: RENDER_DATABASE_URL is not set."
  echo ""
  echo "Get it from the Render dashboard:"
  echo "  Dashboard -> your Postgres database -> Info tab -> External Database URL"
  echo ""
  echo "Usage:"
  echo "  RENDER_DATABASE_URL='postgresql://...' ./scripts/pull-prod-db.sh"
  exit 1
fi

# Check local DB container is running
if ! docker exec "$LOCAL_CONTAINER" psql -U "$LOCAL_USER" -d postgres -c "" -q 2>/dev/null; then
  echo "Error: local database container '$LOCAL_CONTAINER' is not running."
  echo "  Start it with: docker compose up -d db"
  exit 1
fi

# ── Confirm ───────────────────────────────────────────────────────────────────

echo ""
echo "WARNING: This will REPLACE your local '$LOCAL_DB' database with a prod dump."
echo "         All local data will be lost."
echo "         Stop the local API server first (it holds open connections)."
echo ""
read -r -p "Type 'yes' to continue: " confirm
[[ "$confirm" == "yes" ]] || { echo "Aborted."; exit 0; }

# ── Dump ──────────────────────────────────────────────────────────────────────

DUMP_FILE="$ROOT_DIR/.prod_backup.sql"
ERR_FILE=$(mktemp)
trap 'rm -f "$DUMP_FILE" "$ERR_FILE"' EXIT

DUMP_ARGS=(
  "$RENDER_DATABASE_URL"
  --no-owner
  --no-acl
  --no-privileges
  -Fp
)

echo ""
echo "-> Dumping prod database..."

PG_DUMP_DONE=false
SERVER_MAJOR=""

# Try local pg_dump first (fastest); auto-fall back to Docker on version mismatch
if command -v pg_dump &>/dev/null; then
  if pg_dump "${DUMP_ARGS[@]}" > "$DUMP_FILE" 2>"$ERR_FILE"; then
    PG_DUMP_DONE=true
  elif grep -q "server version mismatch" "$ERR_FILE"; then
    SERVER_MAJOR=$(grep -oE 'server version: [0-9]+' "$ERR_FILE" | grep -oE '[0-9]+$')
    echo "   Local pg_dump too old for PG${SERVER_MAJOR} — using Docker image postgres:${SERVER_MAJOR}..."
  else
    cat "$ERR_FILE" >&2
    exit 1
  fi
fi

if [[ "$PG_DUMP_DONE" != true ]]; then
  if [[ -z "$SERVER_MAJOR" ]]; then
    # pg_dump not installed — detect server version via Docker psql (more version-tolerant)
    SERVER_MAJOR=$(docker run --rm postgres:16 psql "$RENDER_DATABASE_URL" \
      -tAc "SELECT current_setting('server_version_num')::int/10000" 2>/dev/null \
      | tr -d ' ' || echo "")
    if [[ -z "$SERVER_MAJOR" ]]; then
      echo "Error: could not detect server version and pg_dump is not installed."
      echo "  Install pg_dump with: brew install postgresql@16"
      exit 1
    fi
    echo "   Server is PG${SERVER_MAJOR} — using Docker image postgres:${SERVER_MAJOR}..."
  fi
  docker run --rm "postgres:${SERVER_MAJOR}" pg_dump "${DUMP_ARGS[@]}" > "$DUMP_FILE"
fi

echo "   $(wc -l < "$DUMP_FILE" | tr -d ' ') lines ($(du -h "$DUMP_FILE" | cut -f1))"

# ── Restore ───────────────────────────────────────────────────────────────────

echo ""
echo "-> Replacing local '$LOCAL_DB' database..."
docker exec "$LOCAL_CONTAINER" psql -U "$LOCAL_USER" -d postgres -q \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$LOCAL_DB' AND pid <> pg_backend_pid();"
docker exec "$LOCAL_CONTAINER" psql -U "$LOCAL_USER" -d postgres -q \
  -c "DROP DATABASE IF EXISTS $LOCAL_DB;"
docker exec "$LOCAL_CONTAINER" psql -U "$LOCAL_USER" -d postgres -q \
  -c "CREATE DATABASE $LOCAL_DB;"

echo "-> Restoring..."
docker exec -i "$LOCAL_CONTAINER" psql -U "$LOCAL_USER" -d "$LOCAL_DB" -q < "$DUMP_FILE"

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
echo "Done. Local database replaced with prod data."
echo ""
echo "Next steps:"
echo "  1. Start the API:  pnpm dev"
echo "     (migrations auto-detect what has already run and skip them)"
echo ""
echo "  2. Test a repair script:"
echo "     cd packages/api"
echo "     pnpm repair:performer-fees"
echo ""
echo "  3. When happy, run against prod by pointing API_BASE_URL at production."
