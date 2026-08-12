#!/usr/bin/env bash
# Deploy the sync-content edge function to the staging Supabase project.
# Run this in your own terminal (needs a TTY for the browser login):
#
#   bash supabase/deploy-sync-content.sh
#
# It logs in if needed, deploys, and smoke-tests the secret wall. AFTER deploying you must set
# the secrets and run a first full sync (see supabase/README.md → "Search index").
set -euo pipefail

SUPABASE="$HOME/.local/share/supabase/supabase"   # the real binary (the ~/.local/bin shim is broken)
PROJECT_REF="cnarqxhknjtqaovmzsco"
FN_URL="https://${PROJECT_REF}.supabase.co/functions/v1/sync-content"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

[ -x "$SUPABASE" ] || { echo "supabase CLI not found at $SUPABASE"; exit 1; }

# 1. Login (opens the browser) — skipped if a token is already cached.
if ! "$SUPABASE" projects list >/dev/null 2>&1; then
  echo "== Logging in to Supabase (browser will open) =="
  "$SUPABASE" login
fi

# 2. Deploy. --no-verify-jwt: the function guards itself with the SYNC_SECRET header.
echo "== Deploying sync-content to $PROJECT_REF =="
cd "$REPO_DIR"
"$SUPABASE" functions deploy sync-content --project-ref "$PROJECT_REF" --no-verify-jwt

# 3. Smoke test: without the secret header the function must refuse (401 unauthorized), not sync.
echo "== Smoke test (no secret → must be rejected) =="
RESP=$(curl -s -m 20 -X POST "$FN_URL" -H "Content-Type: application/json" -d '{}')
echo "no-secret: $RESP"
if echo "$RESP" | grep -q "unauthorized"; then
  echo "OK: the endpoint is guarded. Now: set SYNC_SECRET, then run the first full sync (README)."
elif echo "$RESP" | grep -q "SYNC_SECRET not configured"; then
  echo "OK (deployed), but SYNC_SECRET isn't set yet — set it, then run the first full sync (README)."
else
  echo "WARN: unexpected response — check that the deploy succeeded and the guard is intact."
  exit 1
fi
