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

## Stripe webhook events handled

## Stripe webhook events handled

`customer.subscription.updated` · `customer.subscription.deleted` ·
`invoice.payment_succeeded` · `invoice.payment_failed` · `customer.subscription.trial_will_end`

> Not initialized yet. `supabase init` + `supabase link` once the project exists.
> RLS is mandatory — subscription rows must not be client-writable.
