# migration/ — WP/WooCommerce → Supabase subscriber migration

A **repeatable, idempotent** two-stage pipeline. Drop a fresh dump into `raw/`, run two
commands, and the active subscribers land in Supabase with no duplicates. Designed to run
multiple times: build/test now, again after testing, and once more at go-live to capture
new subscribers.

```
raw/<dump>.sql ──► extract ──► artifacts/subscribers.json ──► load ──► Supabase
                  (Docker MySQL)        (inspect)            (auth + profiles + subscriptions)
```

## What it imports
Only **active subscribers** (subscriptions with status in the active set, default
`wc-active` + `wc-on-hold`), one row per user. Per subscriber: identity (email, name,
registered date), subscription (tier, status, billing interval, renewal date), and Stripe
data (`_stripe_customer_id`, saved card token, any WooPayments subscription id) for a silent
billing cut-over. Subscriptions live in the legacy `wp_posts` store (HPOS is empty here).

> Passwords do **not** migrate (WordPress phpass / `$wp$` hashes are incompatible). Users set
> a password on first login via a recovery link — see `--send-reset`.

## Prerequisites
- **Docker Desktop** (with the `docker compose` plugin), running — for the extract stage.
- A **Supabase project** (use a staging one first, per `CLAUDE.md`). Apply the schema in
  `../supabase/migrations/` and seed `../supabase/seed.sql`.
- `cp .env.example .env` and fill in `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
- `npm install`

## Usage

```bash
# 1. Extract (newest raw/*.sql by default; or pass an explicit path)
npm run extract
npm run extract -- ../raw/some-other-dump.sql
npm run extract -- --statuses=wc-active            # override the active set
npm run extract -- --keep                          # leave MySQL up for debugging

# 2. Inspect artifacts/subscribers.csv and artifacts/summary.json

# 3. Load into Supabase (DRY RUN by default — writes nothing)
npm run load
npm run load -- --apply --limit=5                  # smoke-test 5 records
npm run load -- --apply                            # full import (idempotent)
npm run load -- --apply --send-reset               # also write recovery links to artifacts/
```

Re-running `load --apply` with a newer extract updates existing rows and inserts new
subscribers — never duplicates (keys: `profiles.wp_user_id`, `subscriptions.wp_subscription_id`).

## Layout
- `sql/extract-subscribers.sql` — the join (one row per subscriber); `@STATUS_LIST@` marker
  is substituted with the active-status set at runtime.
- `src/extract.mjs` — boots MySQL 8, imports the dump, runs the query, writes artifacts.
- `src/load.mjs` — idempotent upsert into Supabase (dry-run default).
- `src/lib/` — pure mapping (`tiers.mjs`, `dates.mjs`) + unit tests (`npm test`).
- `artifacts/` — git-ignored output (derived PII).

## Tier mapping
Derived from the subscription's product/line-item name: `Recipe*` → `recipe`,
`Back to Forward*` → `back_to_forward`. Billing interval comes from `_billing_period`. A user
holding both tiers is collapsed to one subscription at the higher tier (`back_to_forward`).

## Verification
1. `npm test` — mapping/date unit tests.
2. `npm run extract` — check `summary.json`: `total_subscribers` ≈ 523, tier/interval
   breakdown, Stripe-id / saved-card coverage, and `needs_review_no_tier` (should be empty).
3. `npm run load` (dry run) — confirms tiers resolve and shows the create/upsert plan.
4. `npm run load -- --apply` against **staging**, then re-run to confirm counts are stable
   (idempotency) and spot-check a few users in the Supabase dashboard.
