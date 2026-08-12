# supabase/ — Auth + Subscriptions Foundation

The shared backend both the website and the app read from.

## Schema (planned)

- `profiles` — one row per user, extends `auth.users` (keeps `wp_user_id` for sync)
- `subscription_tiers` — static lookup: `recipe`, `back_to_forward`
- `subscriptions` — one active row per user; status, billing interval, period dates,
  `stripe_customer_id`, `stripe_subscription_id`, `wp_subscription_id`

See `raw/migration-architecture-outline.md` for full column definitions.

## Layout

- `migrations/` — SQL migrations (schema, RLS policies). Use the Supabase CLI.
- `functions/` — Edge Functions.
  - `wp-articles` — the app's content seam to WordPress (see below).
  - `create-portal-session` — Stripe Customer Portal session for the signed-in member (see below).
  - `stripe-webhook` — Stripe → Supabase subscription sync (see below).

## `wp-articles` Edge Function

Pulls articles from the live WordPress REST API for the app. Two POST actions:
`{ action: 'list' }` (public — recent posts) and `{ action: 'article', slug }` (returns the
full body **only** to a verified paid member; everyone else gets the excerpt + `locked: true`).

WordPress gates article bodies server-side (WooMemberships), so the full body needs an
authenticated WP request. We keep that credential here, server-side, and let Supabase decide
entitlement (verify JWT → check `subscriptions`). When the site's auth later moves to
Supabase and content ungates, only the `WP_*` secrets go away — the function/app interface
stays.

**Deploy (JWT verification OFF at the gateway — the `list` action is public; `article`
verifies the JWT itself):**

```bash
supabase functions deploy wp-articles --no-verify-jwt
supabase secrets set \
  WP_BASE_URL=https://lentinealexis.com \
  WP_USER=<wp-username> \
  WP_APP_PASSWORD=<application-password>
```

`WP_APP_PASSWORD` is a WordPress **Application Password** (Users → Profile → Application
Passwords) for an account whose membership/role can see full content (e.g. an admin). It is
the only throwaway piece. `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are auto-provisioned.

**Smoke test after deploy:**

```bash
# list (public)
curl -sX POST "$SUPABASE_URL/functions/v1/wp-articles" \
  -H 'Content-Type: application/json' -d '{"action":"list","perPage":3}'
# article as a paid member (JWT = a signed-in member's access token)
curl -sX POST "$SUPABASE_URL/functions/v1/wp-articles" \
  -H "Authorization: Bearer $JWT" -H 'Content-Type: application/json' \
  -d '{"action":"article","slug":"<a-real-slug>"}'   # → contentHtml present only if paid
```

The app calls this via `supabase.functions.invoke('wp-articles', …)` in
`mobile/src/lib/articles.ts` (no new client env — the WP credential never leaves the server).

`{ action: 'search', query }` no longer hits WordPress live — it queries the `content_index`
FTS mirror (below). `list`/`today`/`article` still read WordPress. Shared WP→app normalization
lives in `functions/_shared/wp-normalize.ts` (used by both `wp-articles` and `sync-content`).

## Search index (`content_index` + `sync-content`)

Full-catalog search queries a synced Postgres full-text index instead of WordPress live — fast
(tens of ms vs 4–8s cold), always current to the last sync, and able to match recipe
**ingredients/instructions** (which WP `?search=` can't — recipe bodies live in ACF).

- **`content_index`** (migration `0009`) — a service-role-only mirror of every published post +
  recipe: the app `Article` summary as `jsonb` + a generated `search_tsv` (GIN-indexed) built
  from title/excerpt/category/dosha/season + the recipe's ingredient/instruction text. The app
  never reads it directly — search goes through `wp-articles`, which returns only summaries.
- **`sync-content`** edge function — pulls the whole catalog from WP REST (authenticated,
  paginated), normalizes via `_shared/wp-normalize.ts`, upserts into `content_index`, and prunes
  rows for unpublished items. Guarded by a `SYNC_SECRET` request header (the endpoint is not open).
- **`la-rest-fields.php`** — adds an **auth-only** `search_text` REST field on recipes (the
  stripped assembled body) so the sync reads ingredient text without per-recipe round trips.
  Ingredient text never reaches the public REST surface.

**Deploy (staging first — the site is live):**

```bash
# 1. Migration
supabase db push                                   # applies 0009_content_index.sql

# 2. Re-upload mu-plugins to WP (adds the recipe `search_text` field) — see the staging refresh runbook.

# 3. Deploy functions + set the sync secret (WP_* are already set for wp-articles).
bash supabase/deploy-sync-content.sh               # deploys sync-content + smoke-tests the auth wall
supabase functions deploy wp-articles --no-verify-jwt
supabase secrets set SYNC_SECRET=<random-hex>

# 4. First full sync (populate the index):
curl -sX POST "$SUPABASE_URL/functions/v1/sync-content" \
  -H "x-sync-secret: $SYNC_SECRET" -H 'Content-Type: application/json' -d '{}'
#   → {"ok":true,"synced":{"post":N,"recipe":M}}
```

**Keep it fresh — pg_cron** (every 15 min). Run once in the SQL editor (needs the `pg_cron` +
`pg_net` extensions; in prod store the secret in Vault rather than inline):

```sql
select cron.schedule('sync-content', '*/15 * * * *', $$
  select net.http_post(
    url     := 'https://<project-ref>.supabase.co/functions/v1/sync-content',
    headers := jsonb_build_object('Content-Type','application/json','x-sync-secret','<SYNC_SECRET>'),
    body    := '{}'::jsonb
  );
$$);
```

**Optional — near-instant updates:** a `save_post` / `transition_post_status` hook in the
mu-plugin that POSTs to `sync-content` on publish. Cron is the baseline; the hook just shortens
the lag (at the cost of an outbound call from WP on every save), so it isn't shipped by default.

**Smoke test** — a term that appears only in a recipe's ingredients should now return it:

```bash
curl -sX POST "$SUPABASE_URL/functions/v1/wp-articles" \
  -H 'Content-Type: application/json' -d '{"action":"search","query":"cardamom"}'
```

## Billing Edge Functions (Stripe Customer Portal)

The app's "Manage subscription" (tier change + cancel) rides on Stripe's hosted Customer
Portal — Stripe owns proration, cancellation, and card entry; Supabase stays the single
source of tier truth for both the site and the app.

**`create-portal-session`** — POST `{ returnUrl? }` with the caller's Supabase JWT. Returns
`{ url }` (open in a browser) or `{ manageable: false, reason }` when the member's billing
isn't in our Stripe account (e.g. pre-cut-over WooPayments subscribers) — the app then shows
a "manage on the web" fallback. `returnUrl` is honored only when its origin is in the
`PORTAL_RETURN_ORIGINS` allowlist; otherwise `PORTAL_RETURN_URL` is used (the portal requires
http(s) — the `lentine://` scheme is rejected by Stripe).

**`stripe-webhook`** — Stripe events, verified by signature. Events handled:

`customer.subscription.updated` · `customer.subscription.deleted` ·
`invoice.payment_succeeded` · `invoice.payment_failed` ·
`customer.subscription.trial_will_end` (acknowledged + logged only, v1)

Every event funnels into one sync: retrieve the subscription live from Stripe, write absolute
values into `subscriptions` (status, tier, interval, period dates, `cancel_at_period_end`) —
idempotent and order-independent.

**Price ↔ tier convention:** the four Stripe prices carry `lookup_key`s named
`<tier>_<interval>` — `recipe_month` · `recipe_year` · `back_to_forward_month` ·
`back_to_forward_year`. The webhook parses the key; an unrecognized key still syncs
status/periods but never changes the tier.

**Deploy + secrets:**

```bash
bash supabase/deploy-billing.sh   # deploys both + smoke-tests the auth walls
supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  PORTAL_RETURN_URL=https://lentineale2stg.wpenginepowered.com/app \
  PORTAL_RETURN_ORIGINS=http://localhost:8081,https://lentineale2stg.wpenginepowered.com
```

`create-portal-session` deploys with gateway JWT verification ON (default); `stripe-webhook`
with `--no-verify-jwt` (Stripe sends no Supabase JWT — the signature is the auth). Both have
deno tests: `deno test supabase/functions/create-portal-session/ supabase/functions/stripe-webhook/`.

> RLS is mandatory — subscription rows must not be client-writable (all writes go through the
> webhook's service role).
