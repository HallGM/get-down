#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

echo "🐘 Starting Colima…"
colima start

echo "🐘 Starting Postgres…"
docker compose up -d --wait

echo "🐍 Starting Flask invoice service…"
FLASK_BIN="$ROOT_DIR/invoice/venv/bin/flask"
if [[ ! -x "$FLASK_BIN" ]]; then
  echo "❌ Flask venv not found at $FLASK_BIN"
  echo "   Run: cd invoice && python3 -m venv venv && venv/bin/pip install -r requirements.txt"
  exit 1
fi
# Kill any leftover process on port 5001
lsof -ti :5001 | xargs kill -9 2>/dev/null || true
(cd "$ROOT_DIR/invoice" && FLASK_APP=app.py "$FLASK_BIN" run --port 5001) &
FLASK_PID=$!

# Give Flask a moment to start, then verify it's still running
sleep 2
if ! kill -0 $FLASK_PID 2>/dev/null; then
  echo "❌ Flask failed to start — check invoice/app.py for errors"
  exit 1
fi
echo "   Flask running on http://localhost:5001"

echo "🚀 Starting dev servers…"
pnpm -r dev
EXIT_CODE=$?

kill $FLASK_PID 2>/dev/null || true
exit $EXIT_CODE
