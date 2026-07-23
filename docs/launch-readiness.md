# Launch Readiness — Open Issues & Where to Do Them

Living checklist of what's left before the Lentine Alexis app works end-to-end and ships to
the App Store + Play Store. Each item is tagged with **where** it belongs:

- **[STAGING NOW]** — finish/verify against staging before anything else.
- **[STAGING CONFIG]** — set up in staging (test mode); the production equivalent is redone at go-live.
- **[INFRA — ANYTIME]** — data-independent app/store plumbing; do whenever, needed before submission.
- **[GO-LIVE]** — production cut-over only; gated on an explicit go-ahead + a live-site backup.

Status legend: `[ ]` open · `[x]` done · `[~]` partially done.

_Last updated: 2026-07-23 (added SMTP setup steps in §3)._

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

**Why:** Supabase's default sender (`noreply@mail.app.supabase.io`) is throttled to only a few
messages/hour project-wide and isn't meant for production — repeated signup/resend testing hits
the cap and emails silently stop arriving. Custom SMTP removes the throttle, delivers reliably,
and sends from the Lentine domain. Do it in staging now; the same provider carries to production.

### 3a. Interim testing unblock (no SMTP needed)
- [ ] While SMTP is pending, either **manually confirm** test users (Supabase → Authentication →
      Users → user → confirm email) or **turn off "Confirm email"** (Auth → Providers → Email) so
      `signUp` returns a session directly. Flip confirm back on once SMTP is live.

### 3b. Stand up SMTP with Resend (recommended — fastest path)
Resend has a first-class Supabase integration and simple DNS. (SendGrid / Postmark / AWS SES all
work too — same Supabase fields, different host/creds.)

- [ ] **Create a Resend account** at resend.com.
- [ ] **Add the sending domain.** Resend → Domains → Add Domain. Use a **subdomain** of the brand
      domain, e.g. `mail.lentinealexis.com` or `send.lentinealexis.com` (keeps the root domain's
      reputation isolated; recommended over sending straight from `lentinealexis.com`).
- [ ] **Add the DNS records** Resend shows (at the domain's DNS host / WP Engine):
      **SPF** (TXT), **DKIM** (CNAME/TXT), and the **MX** for the subdomain. Optionally add
      **DMARC** (`_dmarc` TXT, start with `p=none`). Wait for Resend to show **Verified** (minutes
      to a few hours depending on DNS propagation).
- [ ] **Create a Resend API key** (Resend → API Keys → Create, "Sending access").
- [ ] **Configure Supabase custom SMTP:** Supabase → Project Settings → **Authentication → SMTP
      Settings** → enable **Custom SMTP** and enter:
      - Host: `smtp.resend.com`
      - Port: `465` (SSL) or `587` (STARTTLS)
      - Username: `resend`
      - Password: **the Resend API key**
      - Sender email: e.g. `noreply@mail.lentinealexis.com` (must be on the verified domain)
      - Sender name: `Lentine Alexis`
- [ ] **Raise the Auth email rate limits** (Supabase → Authentication → Rate Limits) now that a
      real provider is in place — the tiny default cap no longer applies once custom SMTP is on.
- [ ] **Send a test:** trigger a fresh signup (or Supabase's "send test email") and confirm it
      arrives from the Lentine sender, not `mail.app.supabase.io`.

### 3c. Templates & copy
- [ ] Customize the Auth email templates (Supabase → Authentication → **Email Templates**):
      Confirm signup, Magic link, Reset password, Invite — brand the copy + sender name.
- [ ] Draft the member-facing copy for **password reset** and **go-live invite** emails.

### 3d. Confirm-email policy
- [ ] Decide the **confirm-email** policy (recovery/confirm UI already ships). Keep it **on** once
      SMTP is reliable; the signup flow's `emailRedirectTo` (commit `1094c5f`) points confirm links
      at the app origin, and the Supabase **Site URL** should be set to `https://lentine-app.vercel.app`.

### 3e. Production
- [ ] **[GO-LIVE]** Same Resend domain works for prod; just point the **prod** Supabase project's
      SMTP + Site URL at the production web home, and confirm the sending domain is verified there too.

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
