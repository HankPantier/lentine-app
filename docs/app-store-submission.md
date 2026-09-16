# App Store Submission — Status & Runbook

Getting the Lentine Alexis Expo app (iOS + Android) into the **Apple App Store** and
**Google Play**, using **EAS Build + EAS Submit**.

_Last updated: 2026-09-16 — stopping point: first Android preview build succeeded; next real
gate is store-account enrollment._

Companion: [`launch-readiness.md`](./launch-readiness.md) (feature/data work).

---

## Key facts (for resuming)

| Thing | Value |
|-------|-------|
| EAS project | `@webhank/lentine-alexis` · projectId `c1b8710e-93e2-4823-bfad-70e891de5c6f` |
| Expo account / owner | `webhank` |
| EAS auth | Expo access token in **`raw/lentine-expo.env`** (gitignored), as `EXPO_TOKEN=<token>` |
| iOS bundle id / Android package | `com.lentinealexis.app` |
| App version | `1.0.0` (buildNumber `1`, versionCode `1`) |
| Supabase project (backend) | `cnarqxhknjtqaovmzsco` (build env in `eas.json` points here) |
| Review/demo account | `appreview@lentinealexis.com` (password in your App Store Connect notes) |
| Privacy / Support / Terms | `/privacy-policy/` · `/inquiry/` · `/refund_returns/` on lentinealexis.com |
| First build | Android preview APK, FINISHED — expo.dev → project → Builds |

**Run EAS commands** (token auth, non-interactive):
```bash
cd mobile
export EXPO_TOKEN="$(cut -d= -f2- ../raw/lentine-expo.env | tr -d '[:space:]')"
./node_modules/.bin/eas <command> --non-interactive
```

---

## ✅ Done

**App config & assets**
- [x] `app.json`: name "Lentine Alexis", slug `lentine-alexis`, bundle id + package
      `com.lentinealexis.app`, buildNumber/versionCode, `ITSAppUsesNonExemptEncryption: false`
- [x] On-brand **app icon**, adaptive icon, and splash (navy `#000033` + "Lentine" script;
      replaced the Expo placeholder art). `icon.png` is 1024², no alpha (Apple requirement)
- [x] `eas.json`: `development` / `preview` / `production` build profiles + `production` submit
      profile. Preview/production **env filled** with the `cnarqxhknjtqaovmzsco` Supabase URL +
      anon key
- [x] `eas-cli` installed + `build:*` / `submit:*` npm scripts

**EAS setup**
- [x] Expo account authenticated (token in `raw/lentine-expo.env`)
- [x] EAS project created + linked (`@webhank/lentine-alexis`)
- [x] Android **keystore** generated + EAS-managed (future builds run non-interactively)
- [x] **First native build succeeded** — preview Android APK (v1.0.0)
- [x] Expo Claude Code plugin installed (`expo@claude-plugins-official`)

**Compliance prerequisites**
- [x] **In-app account deletion** (Apple 5.1.1(v)) — built, tested, and **deployed** to
      `cnarqxhknjtqaovmzsco` (`delete-account` edge fn) + smoke-verified
- [x] **Demo/review subscriber** created + verified (unlocks a paid recipe end-to-end)
- [x] Privacy policy / support / terms URLs confirmed live

_All code is on `main` and pushed. Test bar: tsc 0, jest 212/212, deno 6/6, eslint 0 new._

---

## ⏳ Remaining (in order)

### 1. Validate the preview build — *deferred*
- [ ] Install the Android APK on a device and smoke-test with the review account: login →
      a paid recipe unlocks → membership screen shows the "Visit lentinealexis.com" link on
      Android → icon/splash look right → sign out. Report anything off.

### 2. Store enrollment — **the gate for iOS builds + all submissions**
- [ ] **Apple Developer Program** — $99/yr, identity check ~24–48h (start early):
      https://developer.apple.com/programs/enroll/
- [ ] **Google Play Console** — $25 one-time: https://play.google.com/console/signup

### 3. Credentials & submit config (after enrollment)
- [ ] `eas credentials` — set up **iOS** signing (EAS can manage the distribution cert +
      provisioning profile against your Apple account). Android keystore is already done.
- [ ] Fill the `eas.json` **submit** block placeholders: `appleId`, `ascAppId` (App Store
      Connect numeric app id), `appleTeamId`, and the Play `google-service-account.json`
      (gitignored) — create it in Google Cloud with Play Console API access.

### 4. Create the store app records
- [ ] **App Store Connect** → new app (bundle id `com.lentinealexis.app`); copy the numeric
      App ID into `eas.json` → `submit.production.ios.ascAppId`
- [ ] **Play Console** → create app "Lentine Alexis"

### 5. Production builds
- [ ] `npm run build:ios` (needs the Apple account) and `npm run build:android` (`.aab`)

### 6. Store listings & compliance forms
- [ ] **Screenshots** — capture from a build: iPhone 6.7" (1290×2796) + 6.5" (1242×2688);
      Android phone (2+); Play feature graphic (1024×500)
- [ ] Descriptions, keywords, category, age rating / content rating
- [ ] **Apple App Privacy** nutrition label + **Google Play Data Safety** form: email + auth
      data collected for account functionality; **no tracking**; account deletion available
- [ ] Add the review account credentials to **App Store Connect → App Review Information**
      notes (and Play testing instructions), with this line:
      > "Membership is a website subscription (lentinealexis.com). No digital goods are sold
      > in-app; the app gives existing members access to content."

### 7. Submit
- [ ] `npm run submit:ios` → TestFlight → submit for review
- [ ] `npm run submit:android` → Internal testing → promote to Production

### 8. Loose ends
- [ ] Exercise the real **account-deletion** path once with the throwaway review account
      (logic is covered by tests + the deployed fn, but verify the full round trip on device)
- [ ] Optionally delete the orphaned first Expo project `@webhanks-team/webhank` (unused)

---

## Risk register — iOS web-only payments (Guideline 3.1.1)

Membership is sold on the website, not in-app. This is a known gray area. Fallback ladder if
Apple rejects:
1. **Submit as-is** — no purchase UI/link on iOS; reviewer notes explain the model.
2. **If rejected** — reinforce in Resolution Center that no digital goods are sold in-app;
   evaluate the "reader app" framing / External Link Account Entitlement.
3. **If still rejected** — implement Apple **In-App Purchase (StoreKit)** for iOS and reconcile
   entitlement with the Stripe/Supabase tier (the single source of truth). Significant follow-up
   work — scope separately.

Android has no equivalent restriction for this model; the website link is allowed.

---

## Ongoing releases (later)
- **JS-only change:** ship over-the-air with `eas update` (requires wiring an EAS Update
  channel into the `production` profile + `expo-updates` first).
- **Native change or store-visible version bump:** cut a new binary; bump `expo.version`
  (build numbers auto-increment via the `production` profile's `autoIncrement`).
