#!/usr/bin/env bash
# Deploy the wp-articles edge function to the staging Supabase project.
# Run this in your own terminal (needs a TTY for the browser login):
#
#   bash supabase/deploy-wp-articles.sh
#
# It logs in if needed, deploys, and smoke-tests the new `today` action.
set -euo pipefail

SUPABASE="$HOME/.local/share/supabase/supabase"   # the real binary (the ~/.local/bin shim is broken)
PROJECT_REF="cnarqxhknjtqaovmzsco"
FN_URL="https://${PROJECT_REF}.supabase.co/functions/v1/wp-articles"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

[ -x "$SUPABASE" ] || { echo "supabase CLI not found at $SUPABASE"; exit 1; }

# 1. Login (opens the browser) — skipped if a token is already cached.
if ! "$SUPABASE" projects list >/dev/null 2>&1; then
  echo "== Logging in to Supabase (browser will open) =="
  "$SUPABASE" login
fi

# 2. Deploy. --no-verify-jwt: the function does its own JWT check per action.
echo "== Deploying wp-articles to $PROJECT_REF =="
cd "$REPO_DIR"
"$SUPABASE" functions deploy wp-articles --project-ref "$PROJECT_REF" --no-verify-jwt

# 3. Smoke test: `today` must no longer be an unknown action.
echo "== Smoke test =="
RESP=$(curl -s -m 20 -X POST "$FN_URL" -H "Content-Type: application/json" -d '{"action":"today"}')
echo "today (anon): $RESP"
if echo "$RESP" | grep -q "unknown action"; then
  echo "FAIL: deployed function is still the old version (today = unknown action)"
  exit 1
fi
echo "OK: the deployed function knows the today action. Tell Claude it's deployed for the full verification matrix."
