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
- `functions/` — Edge Functions (Stripe webhook handler → updates subscription state).

## Stripe webhook events handled

`customer.subscription.updated` · `customer.subscription.deleted` ·
`invoice.payment_succeeded` · `invoice.payment_failed` · `customer.subscription.trial_will_end`

> Not initialized yet. `supabase init` + `supabase link` once the project exists.
> RLS is mandatory — subscription rows must not be client-writable.
