# Migration & Architecture Outline
*WordPress → Supabase · Stripe · Expo Mobile*
*April 2026*

---

## Project Overview

Building a cross-platform mobile app (Expo/React Native, iOS + Android) for a client whose current site runs on WordPress + WooCommerce + WooMemberships + WooSubscriptions. The WordPress site stays live as a headless content source.

### Current State

| Layer | Current Technology | Status |
|---|---|---|
| Authentication | WordPress + WooCommerce login | Migrating to Supabase |
| Subscriptions | WooCommerce Subscriptions + Memberships | Migrating to Stripe + Supabase |
| Payments | WooPayments (Stripe-backed) | Migrating to direct Stripe |
| Content | WordPress (recipes + Back to Forward) | Stays in WordPress (headless) |
| Front end | WordPress theme (PHP templates) | Stays live; PHP bridge added |
| Mobile | None | New — Expo (React Native) |

### Target Architecture

- **Auth & Data:** Supabase Auth (unified login for WP + mobile) · Supabase DB · Stripe
- **Content:** WordPress (headless) via WPGraphQL
- **Clients:** Expo mobile app (iOS + Android) · WordPress front end with PHP bridge

### Subscription Tiers

| Tier | Content Access | Billing |
|---|---|---|
| Recipe (Basic) | Recipe content only | Monthly + Annual |
| Back to Forward (Premium) | Recipe content + Back to Forward content | Monthly + Annual |

> 523 active subscribers · No free tier · 4 Stripe Price objects total

---

## Phase 1 — Database Migration: WordPress → Supabase

### Supabase Schema

**`profiles`** — one row per user, extends `auth.users`
- `id` (uuid, PK, FK → auth.users.id)
- `email` (text, NOT NULL, UNIQUE)
- `display_name` (text, NOT NULL)
- `wp_user_id` (integer, NULLABLE, UNIQUE) — preserve for sync; null after cut-over
- `created_at`, `updated_at`

**`subscription_tiers`** — static lookup, 2 rows
- `id` (uuid, PK)
- `slug` (text, UNIQUE) — `'recipe'` or `'back_to_forward'`
- `name` (text)
- `description` (text, NULLABLE)

**`subscriptions`** — one active row per user
- `id` (uuid, PK)
- `user_id` (uuid, FK → profiles.id)
- `tier_id` (uuid, FK → subscription_tiers.id)
- `status` — `'active'` | `'cancelled'` | `'past_due'` | `'trialing'`
- `billing_interval` — `'month'` | `'year'`
- `current_period_start`, `current_period_end` (timestamptz) — existing renewal dates honoured
- `stripe_customer_id` (text, NULLABLE, UNIQUE)
- `stripe_subscription_id` (text, NULLABLE, UNIQUE)
- `wp_subscription_id` (integer, NULLABLE) — preserve until fully cut-over
- `created_at`, `updated_at`

### WordPress Export (MySQL)

**Users query** — pulls all users with a membership record; verify count = 523.

**Subscriptions query** — pulls from `wp_posts` (type `shop_subscription`) + `wp_postmeta` for status, billing interval, and schedule dates.

**Tier mapping:**

| WooCommerce plan slug | Supabase tier slug |
|---|---|
| *(confirm from WP admin)* | `recipe` |
| `back-to-forward` *(confirm exact slug)* | `back_to_forward` |

### Import to Supabase

One-time Node.js migration script (run on staging first):
1. Read CSV exports
2. Create Supabase Auth user per email (temporary random password)
3. Insert `profiles` row (store `wp_user_id`)
4. Resolve tier from WC plan slug mapping
5. Insert `subscriptions` row (`current_period_end` from WC `next_renewal`)
6. Trigger password-reset email to all 523 users

> ⚠️ WordPress passwords cannot be transferred — a password-reset email is required for all existing users.

---

## Phase 2 — Stripe Product & Webhook Setup

### WooPayments → Stripe — Important Note

WooPayments is powered by Stripe. Existing customer payment methods are already stored as Stripe PaymentMethod objects. **It may be possible to migrate existing subscriptions without asking users to re-enter their card details** by attaching their existing Stripe Customer IDs to new Stripe Subscription objects.

**Action:** Export Stripe Customer IDs from WooPayments and store them in `subscriptions.stripe_customer_id` during the Phase 1 import.

### Stripe Product Structure

| Product | Interval | Notes |
|---|---|---|
| Recipe | Monthly | Match current WC monthly rate |
| Recipe | Annual | Match current WC annual rate |
| Back to Forward | Monthly | |
| Back to Forward | Annual | |

### Stripe Webhooks → Supabase

Deploy a Supabase Edge Function to handle:

| Stripe Event | Action in Supabase |
|---|---|
| `customer.subscription.updated` | Update status, tier, period dates |
| `customer.subscription.deleted` | Set status = `'cancelled'` |
| `invoice.payment_succeeded` | Update `current_period_start/end` |
| `invoice.payment_failed` | Set status = `'past_due'` |
| `customer.subscription.trial_will_end` | Send reminder notification |

---

## Phase 3 — WordPress PHP Bridge

### Login Flow

1. User submits email + password on WP login page
2. PHP calls Supabase Auth REST API (`signInWithPassword`)
3. Supabase returns JWT access + refresh tokens
4. PHP stores JWT in a secure, httpOnly cookie
5. PHP fetches user's subscription row from Supabase
6. PHP sets WP session variable with tier slug
7. WP templates gate content using that tier slug

### PHP Helpers

Two functions added to `functions.php` or a mu-plugin:
- `btf_supabase_sign_in( $email, $password )` — authenticates against Supabase, returns tokens
- `btf_get_subscription_tier( $supabase_uid )` — queries `subscriptions` table, returns tier slug

Credentials (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) stored in `wp-config.php`.

### Content Gating in Templates

Replace all `wc_memberships_is_user_active_member()` calls with `btf_user_has_tier()`:

```php
if ( btf_user_has_tier( 'recipe' ) ) { /* show recipe content */ }
if ( btf_user_has_tier( 'back_to_forward' ) ) { /* show Back to Forward content */ }
```

> ⚠️ Audit every `wc_memberships_` call in the theme before switching. Full text search across the theme directory.

---

## Phase 4 — Expo Mobile App (Initial Scope)

### Stack

| Concern | Library / Tool |
|---|---|
| Framework | Expo (SDK 51+) with Expo Router |
| Auth | `@supabase/supabase-js` with AsyncStorage session |
| Content fetching | WPGraphQL + `graphql-request` or `urql` |
| Payments | `@stripe/stripe-react-native` |
| State management | Zustand or React Context |
| Styling | NativeWind (Tailwind for RN) or StyleSheet |
| Push notifications | Expo Notifications + Supabase Edge Function |

### Auth Flow

1. On app launch: check for existing Supabase session (AsyncStorage)
2. If no session: Login screen → `signInWithPassword` → store session
3. On success: fetch subscription row → store tier in global state
4. Gate content screens based on tier (client-side enforcement)
5. Token refresh handled automatically by `@supabase/supabase-js`

### Content Architecture

WordPress is the editorial source of truth. App fetches via WPGraphQL.

| Content type | Access |
|---|---|
| Recipes | Available to `recipe` and `back_to_forward` tiers |
| Back to Forward | Available to `back_to_forward` tier only |

> The app enforces gating based on the Supabase subscription record — WordPress is treated as a public content API.

---

## Open Items

| # | Item | Priority |
|---|---|---|
| 1 | Confirm exact WooCommerce membership plan slugs from WP admin | High |
| 2 | Export Stripe Customer IDs from WooPayments | High |
| 3 | Decide payment migration UX — silent Stripe migration vs. prompted card re-entry | High |
| 4 | Audit all `wc_memberships_` calls in WordPress theme | High |
| 5 | Draft password-reset email copy for 523 migrated users | Medium |
| 6 | Confirm WPGraphQL post types / slugs for recipe and B2F content | Medium |
| 7 | Confirm current WooCommerce monthly/annual pricing for both tiers | Medium |
| 8 | Confirm WordPress staging environment URL | Medium |

---

## Recommended Sequencing

1. Set up Supabase project; create schema
2. Export MySQL data from WP staging
3. Run migration script on staging; validate 523 users
4. Set up Stripe products and pricing (test mode)
5. Deploy Stripe webhook Edge Function to Supabase staging
6. Build WordPress PHP bridge on staging (audit WC calls first)
7. Test full login + gating flow on WP staging
8. Scaffold Expo app; wire up Supabase Auth
9. Add WPGraphQL queries for recipe + B2F content
10. Add Stripe payment flow to Expo app (new subscriptions)
11. End-to-end test on staging
12. Production migration — run script, cut-over PHP bridge, submit app
