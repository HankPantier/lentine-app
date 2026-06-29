# WordPress ⇄ Supabase Cutover Runbook

How to deploy and verify the **login → dashboard → home‑with‑articles** work and the **WordPress
Supabase login bridge**. App-side code (TS + Edge Function + WP PHP) is written and statically
verified; the steps below are the environment/credential-gated parts that finish the loop with a
live end-to-end check.

Supabase project ref: `cnarqxhknjtqaovmzsco` (from `mobile/.env` → `EXPO_PUBLIC_SUPABASE_URL`).

---

## What changed (already in the tree)

**App (Expo) — fully verified (tsc + jest 32/32 + e2e 9/9):**
- `mobile/src/lib/entitlement.ts` — added `entitledTier()` + tier-aware `canAccess()`.
- `mobile/src/lib/articles.ts` — `Article` now carries `type` ('post'|'recipe') + `visibility`.
- `mobile/src/app/home.tsx` — mixed feed, in-app sort chips (Recent/Type/Category), lock badges.
- `mobile/src/components/ArticleCard.tsx` — `locked` badge + type tag.
- `mobile/src/app/articles/[slug].tsx` — recipe-friendly HTML styles.
- `mobile/src/lib/entitlement.test.ts`, `mobile/e2e/articles.spec.ts` — coverage.

**Edge Function — `deno check` clean (live curl below):**
- `supabase/functions/wp-articles/index.ts` — `list` merges posts + recipes; `article` is
  tier-aware and pulls recipe bodies from the WP `la/v1/recipe/<slug>` route.

**WordPress (live install — also mirrored to `wordpress/mu-plugins/` in this repo for version
control, since the WP site is NOT under git):**
- `wp-content/themes/lentinealexis/lib/cpt.php` — recipe CPT `show_in_rest => true` (one line).
- `wp-content/mu-plugins/la-rest-fields.php` (new) — REST `visibility`/`content_type` + recipe
  sort labels + auth-only `GET /wp-json/la/v1/recipe/<slug>` (assembled body).
- `wp-content/mu-plugins/supabase-bridge.php` (new) — `btf_supabase_sign_in`,
  `btf_get_subscription_tier`, `btf_user_has_tier`, `authenticate` filter (email match + native
  fallback), tier cache, logout cleanup.
- `wp-content/themes/lentinealexis/single-recipe.php` & `single.php` — `$subscriber` now resolves
  from `btf_user_has_tier()` (recipe templates allow either tier; B2F posts require
  `back_to_forward`); all WooMemberships/Subscriptions gating calls removed.

---

## WP deploy targets (important)

The WP changes were applied to the **local** install (`/Users/webhank/Local Sites/lentine`). They
serve two different consumers, so they deploy to two places:

- **Phase 0 REST surface** (`lib/cpt.php` `show_in_rest`, `mu-plugins/la-rest-fields.php`) must also
  be copied to the **public staging** WordPress — the deployed (cloud) Edge Function reads over the
  internet and **cannot reach `localhost`**. Without these on staging, the app feed shows posts only
  (no recipes) and recipe bodies won't unlock.
- **Track B bridge + template gating** (`mu-plugins/supabase-bridge.php`, `single*.php`) is verified
  on **Local** first (Step 5), then rolled to staging/production at cut-over.

The two mu-plugins are mirrored in this repo at `wordpress/mu-plugins/` (copy to each target's
`wp-content/mu-plugins/`). The theme edits (`cpt.php`, `single.php`, `single-recipe.php`) are
surgical — re-apply the same diffs to staging.

## Step 1 — Deploy the Edge Function (needs your interactive login)

```bash
cd /Users/webhank/LocalSites/Lentine
supabase login                                  # opens a browser — only you can do this
supabase link --project-ref cnarqxhknjtqaovmzsco
supabase functions deploy wp-articles --no-verify-jwt
# Point WP_BASE_URL at STAGING; WP_USER + WP_APP_PASSWORD = a WordPress Application Password
# (WP Admin → Users → your user → Application Passwords → Add New):
supabase secrets set \
  WP_BASE_URL=https://lentineale2stg.wpenginepowered.com \
  WP_USER='<wp admin/login>' \
  WP_APP_PASSWORD='<application password>'
```

Smoke test (public list works anonymously):
```bash
source mobile/.env
curl -s -X POST "$EXPO_PUBLIC_SUPABASE_URL/functions/v1/wp-articles" \
  -H 'content-type: application/json' \
  -d '{"action":"list","perPage":6}' | jq '.articles[] | {type,visibility,title}'
```
Expect a mix of `"post"` and `"recipe"` items, each with a `visibility`.

> The `list` action is backward-compatible: if the recipe REST surface isn't live yet, it simply
> returns posts only (recipe endpoint 404 → skipped). Safe to deploy before the WP changes land.

## Step 2 — wp-config.php constants (local + staging; NEVER commit)

Add to `wp-config.php` (local: `/Users/webhank/Local Sites/lentine/app/public/wp-config.php`),
above “That’s all, stop editing”:

```php
define( 'SUPABASE_URL', 'https://cnarqxhknjtqaovmzsco.supabase.co' );
define( 'SUPABASE_ANON_KEY', '<anon public key>' );          // Project Settings → API → anon
define( 'SUPABASE_SERVICE_ROLE_KEY', '<service role key>' ); // Project Settings → API → service_role
```

If these are absent the bridge stays inert and WordPress logs in normally.

## Step 3 — Seed a test login

Run `supabase/migrations/0002_app_auth_support.sql` in the **staging** Supabase SQL editor. It sets
the password `LentineTest123!` on one active subscriber and returns that subscriber's email. Note
which **tier** that subscriber has; to test both gates, also identify a second active subscriber on
the other tier (`recipe` vs `back_to_forward`).

---

## Step 4 — Verify the APP (against staging)

```bash
cd /Users/webhank/LocalSites/Lentine/mobile
npm test && npx tsc --noEmit && npm run e2e   # already green; re-confirm
npm run web                                    # then in the browser:
```
Sign in with the migration-0002 email + `LentineTest123!` → home shows the mixed posts+recipes
feed with lock badges → tap **Type**/**Category** to re-sort → open an unlocked recipe (full body)
and a locked Back-to-Forward post (members-only state).

## Step 5 — Verify the WordPress bridge (on localhost:10013, production untouched)

Start the Local site, then:
1. Visit `http://localhost:10013/my-account`, sign in with the test email + `LentineTest123!`.
   Confirm login succeeds and resolves to the matching WP user.
2. Open a `visibility=paid` **recipe** → a `recipe`-tier member sees the full recipe; a
   non-subscriber sees the locked block.
3. Open a `visibility=paid` **Back-to-Forward post** → only a `back_to_forward` member sees the
   body; a `recipe`-tier member sees the locked block.
4. Open a `visibility=free` recipe and post → open to signed-out users.
5. Confirm an **admin** still logs in (Supabase fails → native fallback) and sees everything.

Quick REST checks once Local is up:
```bash
curl -sk 'https://localhost:10013/wp-json/wp/v2/recipe?per_page=2&_embed=1' | jq '.[].visibility'
curl -sk -u '<WP_USER>:<WP_APP_PASSWORD>' \
  'https://localhost:10013/wp-json/la/v1/recipe/<recipe-slug>' | jq '.recipe_body | length'
```

---

## Plugins to disable on staging

**Disable IMMEDIATELY (can move real money / email real users / intercept bridge requests):**

| Plugin | Why |
|---|---|
| `woocommerce-subscriptions` | renews/charges real saved cards on schedule |
| `woocommerce-payments` | live card charges |
| `woocommerce-subscriptions-gifting` | can trigger gift/subscription purchases |
| `mailchimp-for-woocommerce` | syncs/blasts real Mailchimp audiences |
| `ninja-forms-mail-chimp` | pushes submissions to live Mailchimp |
| `wp-html-mail` | wraps/sends real transactional email |
| `automatic-teachable-student-enrollment-for-woocommerce` | auto-enrolls real Teachable students |
| `jetpack` + Jetpack WAF | WAF/brute-force can break the `la/v1` route & `authenticate` filter |

**Disable AT CUT-OVER (once the bridge is verified):**

| Plugin | Why |
|---|---|
| `woocommerce-memberships` | turn off only after `btf_user_has_tier` provably owns all gating (Supabase = single source of truth) |
| host-level cache (WP Engine / Local) | exclude `/wp-json/la/v1/*`, `/my-account`, and login so the bridge session/tier reflect reality |

> Keep WooCommerce **core** enabled — the recipe template still instantiates `WC_Product_Factory`
> at the top, and disabling core would fatal. Only the membership/subscription/payment/email/
> integration plugins above are in scope.

---

## Open items / risks

- The access rule lives in three mirrored places — `entitlement.canAccess` (app),
  `wp-articles` `canUnlock` (edge), `btf_user_has_tier` (WP). Keep them identical.
- Bridge email match assumes Supabase email == `wp_users` email (true for migrated users).
- Recipe bodies are assembled HTML from ACF (port of `single-recipe.php`); structured fields
  (servings spinner, favorite button) are intentionally omitted from the app body.
- `SUPABASE_SERVICE_ROLE_KEY` in local `wp-config.php` points at staging Supabase — fine for
  testing; ensure `wp-config.php` is never committed.
