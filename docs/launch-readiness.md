# Launch Readiness — Open Issues & Where to Do Them

Living checklist of what's left before the Lentine Alexis app works end-to-end and ships to
the App Store + Play Store. Each item is tagged with **where** it belongs:

- **[STAGING NOW]** — finish/verify against staging before anything else.
- **[STAGING CONFIG]** — set up in staging (test mode); the production equivalent is redone at go-live.
- **[INFRA — ANYTIME]** — data-independent app/store plumbing; do whenever, needed before submission.
- **[GO-LIVE]** — production cut-over only; gated on an explicit go-ahead + a live-site backup.

Status legend: `[ ]` open · `[x]` done · `[~]` partially done.

_Last updated: 2026-07-23._

---

## 1. Finish & verify current features — [STAGING NOW]

Loose ends on features already on `main`:

- [ ] **Signed-in favorites click-through** — `0008` is applied to staging; verify heart → sign in → row lands in `profiles.favorites`.
- [ ] **Native iOS/Android manual pass** — search, favorites, season/dosha meta, reader, and auth deep-links (`lentine://`) are verified on **web only**. Every native path is unverified.
- [ ] **Live signup/login redirect on the Vercel URL** — confirm the Supabase redirect allow-list entry resolves `/set-password` and `/account` on `https://lentine-app.vercel.app`.
- [ ] **WP site sign-in via the Supabase bridge** — `supabase-bridge.php` was re-uploaded but untested since the last staging refresh.
- [x] **Expo web app deploys to Vercel** — `lentine-app.vercel.app` is live for pre-store browser testing (2026-07-23). Root Directory = `mobile`; build via `mobile/scripts/vercel-build.sh`.

## 2. Stripe billing / in-app "Manage subscription" — [STAGING CONFIG] now, real linkage [GO-LIVE]

The code is done (`create-portal-session` + `stripe-webhook` edge fns, `openManageSubscription`
in `mobile/src/lib/billing.ts`, the account-screen Manage button). It **falls back to the
website today because the functions are undeployed and Stripe isn't configured.** To make the
in-app portal work:

- [ ] Apply migration **`0007`** (cancel flag) — *not yet applied even to staging*.
- [ ] **Stripe TEST dashboard**: 2 products / 4 prices with lookup keys (`recipe_month|recipe_year|back_to_forward_month|back_to_forward_year`), Customer Portal config, webhook endpoint, secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PORTAL_RETURN_URL`, `PORTAL_RETURN_ORIGINS`).
- [ ] **Deploy** `create-portal-session` + `stripe-webhook` (`supabase/deploy-billing.sh`).
- [ ] **Manual loop:** attach a test `cus_`/`sub_` to a staging user → portal tier-switch → cancel → confirm the null-id web fallback.
- [ ] **Decide the ~52 members without a Stripe `cus_`** — comp/grandfather, or require a card on first app login.
- [ ] **iOS 3.1.1 sign-off** — managing an existing Stripe (non-IAP) sub externally is allowed, but **no purchase/upgrade links on iOS**. Confirm what the Manage button shows per platform.
- [ ] **[GO-LIVE]** Redo all of the above in Stripe **LIVE** mode against **prod** Supabase; ensure migrated members carry live `cus_`/`sub_` ids.

## 3. Emails / SMTP — [STAGING CONFIG] now, critical [GO-LIVE]

- [ ] Configure **SMTP in Supabase** — password resets + member invites can't currently send. Draft the email copy.
- [ ] Decide the **confirm-email** policy (recovery UI already ships).

## 4. App Store / native build infrastructure — [INFRA — ANYTIME], required before submission

None started yet:

- [ ] **`app.json`**: set an iOS `bundleIdentifier` + Android `package` (currently just `slug: "mobile"`, scheme `lentine`, no IDs).
- [ ] **Real app icon + splash** (still the Expo placeholder art) — needs brand assets.
- [ ] **EAS Build + EAS Submit** config; **Apple Developer** + **Google Play** accounts.
- [ ] **Store listings**: screenshots, description, **privacy policy URL**, support URL.
- [ ] **Push notifications**: the notification *prefs* UI exists, but actual push delivery isn't implemented — decide if v1 needs APNs/FCM or ships prefs-only.

## 5. Security — [GO-LIVE] (do before, or as part of, cut-over)

- [ ] **Rotate** the Supabase access token (`sbp_…`) and the WP "LentineApp" application password (both passed through chat previously).
- [ ] If anon/service keys rotate, re-sync `mobile/.env`, **Vercel env vars**, and WP `aa-supabase-config.php`.

## 6. Production cut-over — [GO-LIVE] only (explicit go-ahead + live-site backup required)

- [ ] **Reimport subscribers** from the **production** Woo dump (larger than staging's 562): `npm run extract` → `npm run load --apply`.
- [ ] Apply **all migrations** to prod Supabase (`0001`–`0008`, incl. `0007`).
- [ ] **Prod WordPress**: copy the two mu-plugins + theme patches, add the `SUPABASE_*` constants **via mu-plugin** (WP Engine wp-config edits don't stick), keep **WooCommerce core ON**, disable the Woo add-ons (Subscriptions/Payments/Gifting/Memberships/Mailchimp/NF-Mailchimp/WP-HTML-Mail/Teachable/Jetpack+WAF).
- [ ] Point the edge fn `WP_BASE_URL` → prod; set prod `WP_APP_PASSWORD`.
- [ ] **Web home decision**: real domain vs. keep Vercel; update Supabase redirect URLs + Stripe portal return origins to match.
- [ ] Runbook: `docs/wordpress-supabase-cutover.md`.

---

## The short version

| When | What |
|------|------|
| **Staging now** | Verify current features (esp. **native**); stand up **Stripe in test mode** so the in-app portal works. |
| **Anytime (data-independent)** | App icons/IDs, EAS build config, store listings, privacy policy. |
| **Go-live only** | Subscriber reimport, prod WordPress changes, Stripe **live** mode, key rotation. |

The billing item (§2) is what directly enables "manage the subscription inside the app" — a
configuration/deploy effort, not new code.
