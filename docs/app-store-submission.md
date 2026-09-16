# App Store Submission Runbook — iOS + Android

A zero-to-live guide for getting the Lentine Alexis Expo app into the **Apple App Store** and
**Google Play Store** using **EAS Build + EAS Submit**. Written for someone who has never
submitted an app before — every command is copy-pasteable and every console step is named.

All commands run from the **`mobile/`** directory unless noted.

**Companion doc:** [`launch-readiness.md`](./launch-readiness.md) tracks the feature/data work
that must be finished first. This doc is the store-mechanics layer on top of it.

> **Chosen strategy (first submission):** memberships are purchased on the **website**, not
> in-app. iOS shows no purchase link (App Store Guideline 3.1.1); Android shows a website
> link. We submit as-is and accept the rejection risk — see [§7 Risk register](#7-risk-register).

---

## 0. Prerequisites & accounts

Start these on **day 1** — Apple's identity verification can take 24–48h (longer for orgs).

| # | Task | Where | Cost |
|---|------|-------|------|
| 0.1 | Enroll in the **Apple Developer Program** | [developer.apple.com/programs](https://developer.apple.com/programs/) | $99 / yr |
| 0.2 | Create a **Google Play Console** account | [play.google.com/console](https://play.google.com/console/signup) | $25 once |
| 0.3 | Create / log in to an **Expo account** | [expo.dev](https://expo.dev) | free |
| 0.4 | Decide the **production Supabase** URL + anon key to ship (the repo `.env` is **staging**) | — | — |

Install and authenticate the CLI (already added as a devDependency, so `npx` works too):

```bash
npm install                 # installs eas-cli locally (see package.json devDependencies)
npx eas login               # log in with your Expo account
npx eas whoami              # confirm you're logged in
```

---

## 1. One-time project setup

### 1.1 Link the project to EAS
```bash
npx eas init
```
This creates the project on Expo's servers and writes `extra.eas.projectId` + `owner` into
`app.json`. Commit that change.

### 1.2 Production environment — DONE
The `preview` and `production` build profiles in `eas.json` are already pointed at the
`cnarqxhknjtqaovmzsco` Supabase project (the one holding the migrated subscribers + the deployed
`delete-account` fn). The anon key is a public client key, so committing it is fine. If you ever
move to a separate prod project, swap `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`
in both build profiles (or use `npx eas env:create` to store them as EAS env vars).

### 1.3 Set up signing credentials (EAS manages them for you)
```bash
npx eas credentials
```
- **iOS:** choose "Let EAS handle it" — it creates the distribution certificate + provisioning
  profile against your Apple Developer account (you'll log in with your Apple ID).
- **Android:** EAS generates and stores an upload keystore. **Do not lose access** — it's tied
  to the app forever. EAS keeps a copy; you can also download a backup.

App identity is already set in `app.json`:
- Bundle identifier (iOS): `com.lentinealexis.app`
- Package (Android): `com.lentinealexis.app`

---

## 2. Pre-submission compliance checklist

Confirm each before building the production binary. Status as of the packaging pass:

- [x] **In-app account deletion** (Apple Guideline 5.1.1(v)) — **DONE**. The account screen
      (`src/app/account.tsx`) has a two-step "Delete my account" flow backed by the
      `delete-account` edge function (`supabase/functions/delete-account/`), which removes the
      member's `subscriptions` + `profiles` rows and then the auth user. It also warns that
      deletion doesn't cancel an active paid membership. **Deploy the function before submit:**
      `supabase functions deploy delete-account`.
- [x] **Real app icon** — **DONE (candidate)**. `assets/images/icon.png` is now a 1024×1024
      on-brand mark (the "Lentine" script, cream on navy `#000033`, teal accent; no alpha), with
      a matching Android adaptive foreground and navy splash. Built from the brand wordmark — the
      owner can swap in final art at the same paths. Store-quality, but not a substitute for a
      designer's sign-off if desired.
- [ ] **Store screenshots** — still needed; they require a real build. Capture from the preview
      build on the required simulators/devices (sizes in §3/§4). **Blocked on the first EAS build.**
- [x] **Demo/review account** — **DONE**. A permanent subscriber `appreview@lentinealexis.com`
      exists in `cnarqxhknjtqaovmzsco` at the top tier (`back_to_forward`, active); verified it
      signs in and unlocks a paid recipe (`locked:false`, real body). **Paste its password (given
      to you when it was created) into the App Store Connect App Review notes + Play testing
      instructions.** The password is resettable and the account is deletable via the app's own
      delete flow.
- [x] **Privacy policy + support URLs** — confirmed live:
  - Privacy: `https://lentinealexis.com/privacy-policy/`
  - Support/contact: `https://lentinealexis.com/inquiry/`
  - Terms: `https://lentinealexis.com/refund_returns/`
- [ ] **App privacy disclosures:**
  - Apple **App Privacy** ("nutrition label") in App Store Connect: declare email + auth data
    collected for account functionality; **no tracking**; not used for advertising.
  - Google Play **Data Safety** form: same — email/auth collected, encrypted in transit,
    account deletion available.
- [x] **Export compliance** — handled: `ITSAppUsesNonExemptEncryption: false` is set in
      `app.json`, so Apple won't prompt on each submit.

### Demo/review account recipe
App Review must be able to reach gated content. Create a permanent test subscriber:
1. In the app (or on the web), sign up a dedicated address, e.g. `appreview@lentinealexis.com`.
2. Grant it an active membership so gated recipes unlock — in Supabase, insert/patch its
   `subscriptions` row to `status = 'active'` with a paid `tier` (e.g. `recipe`). *(Do this
   against the same Supabase project the production build points at.)*
3. Verify the login unlocks a paid recipe, then paste the credentials into the App Store Connect
   **App Review Information** notes (and Play Console testing instructions).

---

## 3. Apple App Store flow

### 3.1 Create the app record
In **App Store Connect** → **Apps** → **+** → **New App**:
- Platform: iOS · Name: **Lentine Alexis** · Primary language
- Bundle ID: `com.lentinealexis.app` (register it under **Certificates, IDs & Profiles** first
  if it isn't listed)
- SKU: any unique string (e.g. `lentine-alexis-ios`)

Copy the numeric **App ID** (Apple ID) shown on the app's page → put it in `eas.json` →
`submit.production.ios.ascAppId`, and set `appleId` (your email) + `appleTeamId`.

### 3.2 Build the production binary
```bash
npx eas build --platform ios --profile production
```
Wait for the cloud build to finish (link printed in the terminal / on expo.dev).

### 3.3 Upload to App Store Connect
```bash
npx eas submit --platform ios --profile production
```
The build lands in **TestFlight** first.

### 3.4 TestFlight internal test
Add yourself as an internal tester and install via the TestFlight app. Run the
[§6 on-device smoke test](#6-on-device-smoke-test).

### 3.5 Store listing + submit for review
In App Store Connect, complete:
- **Screenshots** — required sizes: **6.7"** iPhone (1290×2796) and **6.5"** iPhone
  (1242×2688). Add **12.9" iPad** (2048×2732) only if the app is offered on iPad.
- Description, keywords, promotional text, category, age rating.
- Privacy policy URL, support URL, App Privacy answers.
- **App Review notes:** paste the demo subscriber credentials **and** this line:
  > "Membership is a subscription sold on our website (lentinealexis.com). No digital goods or
  > subscriptions are sold inside the app; the app provides access to content for existing
  > members."
- Submit for review.

---

## 4. Google Play Store flow

### 4.1 Create the app + service account
- In **Play Console** → **Create app** → name **Lentine Alexis**, app (not game), free.
- Create a **Google Cloud service account** with Play Console API access, download its JSON
  key, and save it to `mobile/google-service-account.json` (already gitignored). This is what
  `eas submit` uses to upload. (First upload can also be done manually via the console.)

### 4.2 Build the production bundle (`.aab`)
```bash
npx eas build --platform android --profile production
```

### 4.3 Upload
```bash
npx eas submit --platform android --profile production
```
`eas.json` targets the **internal** testing track first (`submit.production.android.track`).

### 4.4 Internal testing → production
- Add testers to the **Internal testing** track, install via the opt-in link, run the
  [smoke test](#6-on-device-smoke-test).
- Complete the Play listing: **screenshots** (min 2 phone screenshots, 16:9 or 9:16), feature
  graphic (1024×500), short + full description.
- **Content rating** questionnaire, **Data safety** form, **target API level** check (EAS
  builds against a current SDK, so this passes), ads declaration (no ads).
- Promote the release from Internal testing → Production.

---

## 5. Ongoing releases

- **JS-only change** (copy, logic, styling): ship over-the-air without a new store review:
  ```bash
  npx eas update --branch production
  ```
  *(Requires wiring an EAS Update `channel` into the `production` build profile + the
  `expo-updates` config; add this when you first need OTA.)*
- **Native change** (new native module, permission, icon, SDK bump) **or** a store-visible
  version bump: cut a **new binary**. Bump `expo.version` (marketing version). Build numbers
  auto-increment because `production` has `"autoIncrement": true`.

---

## 6. On-device smoke test

Install the **preview** build (`npm run build:preview`, distribution: internal) on a real
iPhone + Android device and verify:

- [ ] Sign-in with the demo subscriber works.
- [ ] **Auth deep-link:** trigger a password-reset email; tapping the link opens the app to
      `/set-password` (the `lentine://` scheme). Confirm on both platforms.
- [ ] A gated recipe/article unlocks for the subscriber.
- [ ] **Membership screen:** shows **no purchase link on iOS**; shows the website link on
      Android.
- [ ] "Manage subscription" opens the Stripe portal in the in-app browser (existing web flow).
- [ ] Sign-out clears the session.
- [ ] (Once built) Account deletion removes the account and signs the user out.

---

## 7. Risk register

**Apple Guideline 3.1.1 — external purchases.** Selling membership only on the web, with the
app gating content, is a known gray area. Fallback ladder if rejected:

1. **Submit as-is** (current plan). No purchase UI/link on iOS; reviewer notes explain the
   model.
2. **If rejected:** reply in Resolution Center reinforcing that no digital goods are sold
   in-app, and evaluate the **"reader app"** framing / External Link Account Entitlement.
3. **If still rejected:** implement **Apple In-App Purchase (StoreKit)** for iOS subscriptions
   and reconcile entitlement with the existing Stripe/Supabase tier (the single source of
   truth). This is significant follow-up work — scope separately.

Android has no equivalent restriction for this model; the website link is allowed.

---

## Quick command reference

```bash
# setup
npx eas login
npx eas init
npx eas credentials

# build
npm run build:preview                 # internal test builds, both platforms
npm run build:ios                     # production iOS
npm run build:android                 # production Android (.aab)

# submit
npm run submit:ios                    # → TestFlight
npm run submit:android                # → Play internal track
```
