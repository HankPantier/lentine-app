# migration/ — One-Time WP → Supabase Data Migration

Node.js scripts to move users + subscriptions out of WordPress/WooCommerce into Supabase.
Run on **staging first**; validate before production.

## Source

`raw/lentine-db-export.sql` — 134 MB MySQL dump of the live WordPress DB.
**Not yet parsed.** First job: extract real user + subscription counts and confirm
against the planned ~523.

## Steps (from the outline)

1. Extract users with a membership record (verify count = 523)
2. Extract subscriptions from `wp_posts` (type `shop_subscription`) + `wp_postmeta`
   (status, billing interval, schedule dates)
3. Map WooCommerce plan slug → Supabase tier slug (`recipe` / `back_to_forward`)
4. Create a Supabase Auth user per email (temporary random password)
5. Insert `profiles` (store `wp_user_id`) and `subscriptions` (honor `next_renewal` →
   `current_period_end`, store `stripe_customer_id`)
6. Trigger password-reset emails to all migrated users

> ⚠️ WordPress password hashes cannot transfer — a reset-on-first-login flow is required.
> ⚠️ Export Stripe Customer IDs from WooPayments first so the cut-over can be silent.
