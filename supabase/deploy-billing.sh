#!/usr/bin/env bash
# Deploy the billing edge functions (create-portal-session + stripe-webhook) to the staging
# Supabase project. Run this in your own terminal (needs a TTY for the browser login):
#
#   bash supabase/deploy-billing.sh
#
# Prereqs (one-time, also in your own terminal):
#   supabase secrets set --project-ref cnarqxhknjtqaovmzsco \
#     STRIPE_SECRET_KEY=sk_test_... \
#     STRIPE_WEBHOOK_SECRET=whsec_... \
#     PORTAL_RETURN_URL=https://lentineale2stg.wpenginepowered.com/app \
#     PORTAL_RETURN_ORIGINS=http://localhost:8081,https://lentineale2stg.wpenginepowered.com
#
# It logs in if needed, deploys both functions, and smoke-tests their auth walls.
set -euo pipefail

SUPABASE="$HOME/.local/share/supabase/supabase"   # the real binary (the ~/.local/bin shim is broken)
PROJECT_REF="cnarqxhknjtqaovmzsco"
BASE_URL="https://${PROJECT_REF}.supabase.co/functions/v1"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

[ -x "$SUPABASE" ] || { echo "supabase CLI not found at $SUPABASE"; exit 1; }

# 1. Login (opens the browser) — skipped if a token is already cached.
if ! "$SUPABASE" projects list >/dev/null 2>&1; then
  echo "== Logging in to Supabase (browser will open) =="
  "$SUPABASE" login
fi

cd "$REPO_DIR"

# 2. Deploy. create-portal-session keeps gateway JWT verification ON (default);
#    stripe-webhook must be OFF — Stripe sends no Supabase JWT, the signature is the auth.
echo "== Deploying create-portal-session to $PROJECT_REF =="
"$SUPABASE" functions deploy create-portal-session --project-ref "$PROJECT_REF"

echo "== Deploying stripe-webhook to $PROJECT_REF =="
"$SUPABASE" functions deploy stripe-webhook --project-ref "$PROJECT_REF" --no-verify-jwt

# 3. Smoke tests: both functions must refuse unauthenticated junk.
echo "== Smoke tests =="

# create-portal-session without a JWT → 401 (from the gateway).
STATUS=$(curl -s -m 20 -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/create-portal-session" \
  -H "Content-Type: application/json" -d '{}')
echo "create-portal-session (anon): HTTP $STATUS"
if [ "$STATUS" != "401" ]; then
  echo "FAIL: expected 401 for an unauthenticated portal-session request"
  exit 1
fi

# stripe-webhook with a bogus signature → 400.
STATUS=$(curl -s -m 20 -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/stripe-webhook" \
  -H "Content-Type: application/json" -H "stripe-signature: t=1,v1=bogus" -d '{}')
echo "stripe-webhook (bad signature): HTTP $STATUS"
if [ "$STATUS" != "400" ]; then
  echo "FAIL: expected 400 for a bad webhook signature"
  exit 1
fi

echo "OK: both functions deployed and refusing unauthenticated requests."
echo "Next: point the Stripe (test mode) webhook endpoint at $BASE_URL/stripe-webhook"
echo "and tell Claude it's deployed for the full verification loop."
