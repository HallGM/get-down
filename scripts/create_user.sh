#!/usr/bin/env bash
# Creates a new user in the Get Down app.
#
# Usage:
#   ./scripts/create_user.sh --email=jane@example.com --password=secret123 --first=Jane --last=Doe
#
# Reads ADMIN_EMAIL / ADMIN_PASSWORD from environment or prompts if not set.
# Defaults to production API; override with API_URL env var.

set -euo pipefail

API_URL="${API_URL:-https://get-down-api-4qs2.onrender.com}"

# Load admin credentials from .env in the same directory if present
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [[ -f "$SCRIPT_DIR/.env" ]]; then
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/.env"
fi

# Prompt for all values
read -rp "New user email: " EMAIL
read -rp "New user first name: " FIRST
read -rp "New user last name (optional): " LAST
read -rsp "New user password: " PASSWORD
echo

echo
if [[ -z "${ADMIN_EMAIL:-}" ]]; then
  read -rp "Admin email: " ADMIN_EMAIL
fi
if [[ -z "${ADMIN_PASSWORD:-}" ]]; then
  read -rsp "Admin password: " ADMIN_PASSWORD
  echo
fi

if [[ -z "$EMAIL" || -z "$PASSWORD" || -z "$FIRST" ]]; then
  echo "✗ Email, first name and password are required."
  exit 1
fi

echo "→ Logging in as $ADMIN_EMAIL..."
LOGIN_RESPONSE=$(curl -sf -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | sed 's/.*"token":"\([^"]*\)".*/\1/')
if [[ -z "$TOKEN" || "$TOKEN" == "$LOGIN_RESPONSE" ]]; then
  echo "✗ Login failed: $LOGIN_RESPONSE"
  exit 1
fi
echo "✓ Authenticated"

echo "→ Creating user $FIRST $LAST <$EMAIL>..."
BODY="{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"firstName\":\"$FIRST\",\"lastName\":\"$LAST\"}"
RESULT=$(curl -sf -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$BODY")

echo "✓ Created: $RESULT"
