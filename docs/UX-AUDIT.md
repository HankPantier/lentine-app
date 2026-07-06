# UX/UI Audit — Lentine App

> **Status (2026-07-06, same day):** the fix plan below is IMPLEMENTED.
> M0a `f0cc9ae` (post-leak closed + verified live on staging) · M1 `a0b4ba9` (client perf) ·
> M2 `e6bf135` (edge perf — **deploy pending**) · M3 `8152fe3` (AppHeader) · M4 `d6744c3`
> (membership paths, mock payment removed, signup recovery, prefs fix) · M5 `74449e3`
> (WP "App Landing" template, uploaded to staging).
> **Remaining:** (1) run `supabase login`, then deploy `wp-articles` (fixes C3 + activates M2)
> and re-run the curl gating matrix; (2) assign the App Landing template to a page in WP Admin;
> (3) restore lexidupont@gmail.com's notification prefs; (4) decide the confirm-email policy for
> production (recovery UI now exists either way). Test bar: jest 61/61, e2e 25/25, tsc/lint/deno clean.

**Date:** 2026-07-06 · **Method:** live click-through of the Expo web build (localhost:8081, staging backend) + code review, two passes (expert heuristic pass per Nielsen's 10, and a naive first-time-user pass) across three flows: new user signup→quiz→/today, returning subscriber sign-in→gated recipe, free user→paywall. Timings measured 3× via browser network capture and direct `curl` against the `wp-articles` edge function. Screenshots: `/tmp/lentine-audit/shots/` (session artifacts — say the word and they get committed).

## Summary

The design system itself is in good shape — tokens, typography, and CTA styling are faithful to the brand and the onboarding flow reads beautifully. The problems are underneath: **members-only post content (including a private Zoom link) is served to anonymous users**, the **deployed edge function is stale so /today is silently broken for everyone**, **email confirmation strands every new signup**, and opening a recipe means staring at a blank screen for 2.5–7 s because of a serial server waterfall the client does nothing to hide. The "header changes from page to page" complaint is real and structural: the native header is disabled globally and five hand-rolled variants grew in its place. The paywall is a dead end on every surface. None of these are hard fixes; they are sequenced below as M0–M5 with verification criteria.

---

## Findings — Critical (blocks core goals)

### C1. Members-only post bodies leak to anonymous users — including a private Zoom link
Every post in the feed carries `visibility: "free"` even though the website gates them via WooCommerce ("To access this post, you must purchase Back to Forward Membership…"). Both the client (`mobile/src/lib/entitlement.ts:34-38`) and the edge function (`canUnlock`) treat `free` as open, and the edge's body fetch authenticates as a service account that bypasses Woo's gate.
**Evidence:** anonymous `curl` of `{action:'article', slug:'focus-ayurveda-for-kids-live-session-10-21-2025'}` returned `locked:false` with the full body, including the members-only live-session Zoom URL. All 12 feed posts show `visibility:"free"` while their excerpts contain Woo purchase walls.
**Root cause:** the ACF `visibility` field is unset/defaulted for posts (`wordpress/wp-content/mu-plugins/la-rest-fields.php:42-81`), and gating trusts it exclusively. This is the same leak class commit `3889d0f` fixed for recipe bodies.
**User impact:** paying members' exclusive content (live-session links!) is public; the recipe tier's upsell to Back to Forward is undermined.

### C2. Every new signup dead-ends at "check your email"
Supabase "Confirm email" is **ON** for this project, but `signup.tsx:59` assumes it's off. A new user submits the form and gets a static notice — *"Account created. Check your email to confirm, then sign in."* — with **no resend button, no "I've confirmed" continue, no deep link back into the flow**. The confirmation email's link doesn't return them to signup mode either.
**Evidence:** live signup with a fresh address stopped at `signup.tsx:73-78`; the user remains on `/signup` indefinitely (screenshot 04). The onboarding flow is unreachable for 100% of new users right now. *(Known pending toggle from the Phase-4 notes — "flip Confirm email off in staging Auth" — still on as of today; the fix plan treats it as a policy decision, not just a toggle, since production will need one or the other.)*
**Heuristics:** #3 user control & freedom, #9 help users recover.

### C3. Deployed `wp-articles` function is stale — /today is silently broken for everyone
The deployed function answers `{action:'today'}` with **HTTP 400 `{"error":"unknown action"}`**. The local code has the action (`supabase/functions/wp-articles/index.ts:212-226`) — it was never deployed. The client swallows the error (`lib/articles.ts:50-53` warns and returns `[]`), so **every user sees the "More coming soon" fallback** and the M3 dosha-recipes feature appears shipped while being completely dark.
**Evidence:** 3× curl → 400 in ~0.2 s; live /today showed the dashed fallback card for a vata user while the CMS has vata recipes.
**Heuristic:** #1 visibility of system status (an API failure is presented as a content state). Also a release-process gap: nothing verifies deployed == local. *(This is the known paused deploy gate from the 2026-07-05 session — the audit confirms it's still open and completely invisible to users when it fails.)*

### C4. Opening a recipe/post = 2.5–7 s staring at a blank screen
Measured server-side (`article` action, 3× each):
| Path | Latency | What the user sees |
|---|---|---|
| Entitled recipe open | **2.5–3.5 s** (7.0 s observed in-app with cold edge start) | blank taupe screen, lone ← and a small spinner (screenshot 28) |
| "Free" post open | 2.0–5.4 s | same |
| Locked open (anon) | 0.5–0.7 s | same, then lock panel |
| Feed `list` | 0.39–0.44 s | fine |

Two compounding causes: (a) the edge `article` handler is a serial waterfall — find-by-slug → `auth.getUser` → subscriptions query → *second* WP fetch for the body, which for posts **re-fetches the same post already fetched** (`index.ts:229-241`, `:180`) and for recipes hits the cache-bypassing authenticated `la/v1/recipe` ACF assembly; (b) the reader throws away everything the feed already knows — title, image, excerpt, visibility — and renders nothing until the whole round trip completes (`mobile/src/app/articles/[slug].tsx:45-54`).
**Heuristics:** #1 visibility of status (no skeleton, no context), plus raw response-time failure (>1 s breaks flow; >10 s loses users).

### C5. Mock payment collects card numbers and manufactures a fake subscription
Onboarding's `/payment` takes a real-looking card form ("PAY $9 AND START"), waits 700 ms, and marks the user subscribed **locally only** (`payment.tsx:39-44`) — no Stripe, no Supabase record. The demo disclaimer is one small footnote line. If this build reaches a real user: they typed card digits into a form that charges nothing, they believe they own a membership, and every server-verified surface (gated bodies) will still lock them out.
**Evidence:** completed the flow live; home then shows "YOUR MEMBERSHIP / Recipe Club / Billed monthly" (screenshot 18) with no backing subscription row.
**Heuristic:** #5 error prevention — and a trust/compliance problem, not just UX.

---

## Findings — High Impact

### H1. Feed downloads 6.4 MB of images for 12 cards
`toArticle` returns `media.source_url` — the full-resolution original (up to **1.19 MB each**, 2560 px "-scaled" files) rendered into a 180 pt card (`index.ts:89,96`; `ArticleCard.tsx:35-43`). `_embed` already includes `media_details.sizes`; nothing uses it. This is the main reason "initial posts take a long time" on real networks — the list API itself is fast (~0.4 s).

### H2. Card excerpts leak WooCommerce sales boilerplate and raw HTML entities
Every gated card's excerpt ends with *"To access this content, you must purchase Recipe Club Subscription &ndash; Monthly, Back to Forward Membership &ndash; Monthly, …"* — unescaped `&ndash;`/`&#8220;` and a wall of product names — **even for members who already own the content** (screenshots 26/27/33). It buries the actual teaser, reads as nagware (the paywall shouts from every card), and looks broken.
**Fix location:** sanitize in the edge `toArticle` (strip the Woo "To access…" sentence, decode entities). Heuristics: #8 aesthetic/minimalist, #4 consistency.

### H3. Returning members are forced back through onboarding — and it silently wipes their notification prefs
Every sign-in routes members through quiz-intro → tier-confirm → notifications before home (`signup.tsx` → `/quiz-intro`). Worse: clicking **"Maybe later"** on the notifications step PATCHes `notification_prefs` to `{rituals:false, recipes:false, btf:false}` — observed live overwriting the test member's saved prefs. A member who signed up for recipe alerts and re-signs-in on a new device loses them by declining a screen that looks skippable.
**Heuristics:** #3 user control, #5 error prevention. Fix: skip interstitials when a subscription exists and dosha is synced; never write prefs unless the user changed them (hydrate first — the data is already fetched in `signup.tsx:41-53`).

### H4. No timeout, retry, or cache on any content fetch
All three fetchers are raw `supabase.functions.invoke` in mount effects — refetched on every navigation, no TTL cache, no `AbortController`/timeout, and `home.tsx`'s spinner has no failure state if the promise never settles (observed once live: feed spinner still spinning at 10 s+ while curl answered in 0.4 s). `fetchArticles`/`fetchToday` return `[]` on error, so **failures render as empty content** ("More coming soon", "No articles") — C3 stayed invisible precisely because of this pattern.
**Heuristic:** #1 visibility of status; #9 error recovery (no retry affordance anywhere).

### H5. Five different headers — the inconsistency you noticed is structural
Native headers are disabled globally (`_layout.tsx:87-93`) and every screen rolls its own:
| Variant | Screens | Quirks |
|---|---|---|
| `OnbTopBar` (`Screen.tsx:62-90`) | 10 onboarding screens | back + dots, marginBottom 28 |
| Home hero (`home.tsx:101-122`) | home | wordmark(130) + avatar, **no back** |
| Local `BackButton` (`today.tsx:139-151`) | /today | **no bottom margin**, flips navy/white by state |
| Duplicate `BackButton` (`articles/[slug].tsx:12-24`) | reader | marginBottom 20 |
| Inline Pressables (`account.tsx:154-162`, `edit-answers.tsx:57-65`) | account, edit-answers | account's is **missing `alignSelf:'flex-start'`** — the entire row above the title is an invisible back button |

Four back-button implementations of the same ← glyph with margins 28/20/20/0; logo on 2 of 17 screens at two widths (210/130); no screen titles anywhere, so the reader/account/today screens rely on body headings for orientation. Heuristic: #4 consistency & standards.

### H6. The paywall is a dead end on every surface
- Locked reader panel: single CTA **"OPEN ON THE WEBSITE"** (`articles/[slug].tsx:109-114`) — which opens the *same gated page* on the web, where the user hits the same wall (screenshot 33). A signed-out paying member is never offered "Sign in" here — the highest-value rescue.
- The lock panel calls a **recipe** "the full article" (copy bug, same file).
- Home membership card: "No active subscription." — text only, no action (`home.tsx:290-292`); same on account (`account.tsx:245`), plus "Plan changes and cancellation are coming soon."
- `/tier → /billing → /payment` exists only inside onboarding (and is mocked — C5).
**User-pass verdict:** as a free user I could not find any path to become a member; as a signed-out member I could not find my way back in from the content that told me I needed to be a member. Heuristics: #7 efficiency of use, #3.

---

## Findings — Nice to Have

| # | Finding | Where | Note |
|---|---|---|---|
| N1 | Quiz progress bar shows 0% on Q1 and never reaches 100% (`current/total`) | `quiz.tsx:78` | contradicts the "Question 1 of 12" label beside it |
| N2 | Silent disabled CTA on signup — no inline reason why CONTINUE is gray; auth errors (incl. email errors) render under the **password** field as raw Supabase strings ("Invalid login credentials") | `signup.tsx:16,146` | #9: speak the user's language |
| N3 | "Terms of Service and Privacy Policy" is plain text, not links | `signup.tsx:184` | store review will also flag this |
| N4 | Tier cards: navy "Back to Forward" card + MOST POPULAR badge reads as pre-selected next to the white card; actual selected state is subtle | `tier.tsx` | screenshot 11 |
| N5 | Emoji as iconography (🔒 ✓ ✕ ←) vs. brand icon set | `ArticleCard.tsx:58`, `tier.tsx:78`, `home.tsx:160` | renders differently per platform |
| N6 | Pure-white cards on taupe — design system says white only inside inputs | `home.tsx:57`, `ArticleCard.tsx:33`, `quiz-intro.tsx:47` | intentional? decide once, document |
| N7 | `/payment` crashes on invalid persisted `tier` (render reads `PRICE[tier][interval]` unguarded) | `payment.tsx:27-37` | reproduced with a bad seed; guard for state-shape drift |
| N8 | Off-token colors (`rgba(255,255,255,0.14/0.28/0.5)`, `Rule.tsx` default) and rounded ProgressDots pills vs sharp-corner rule | `result.tsx:100`, `ProgressDots.tsx:12,23`, `Button.tsx:67` | fold into tokens |
| N9 | Dual progress systems during quiz (onboarding dots + question counter + bar) | `quiz.tsx:60-83` | consider hiding dots during the quiz |
| N10 | Root layout returns `null` until fonts load — blank flash on web; splash `/` also returns `null` pre-hydration | `_layout.tsx:80-82`, `index.tsx:35-37` | brief but visible |
| N11 | `important`/orange CTA variant defined but never used; every primary is navy | `Button.tsx` | the tier/paywall CTA is the natural home |

---

## Fix plan

Ordered by (user harm ÷ effort). Each milestone ends with `npm test` + `npm run e2e` green in `mobile/`, and every backend change is verified on staging first (live site untouched).

### M0 — Stop the bleeding (backend + config; no app-code changes) → C1, C3, C2
1. **Close the post-content leak (C1).** In `la-rest-fields.php`, derive `visibility` from the actual WooCommerce Memberships restriction (`wc_memberships_is_post_content_restricted()` / the plan rules) instead of the unset ACF flag — and make the edge **fail closed**: treat anything not explicitly `free` as `paid`. Verify with a curl matrix: anon → `locked:true, contentHtml:null` for the FOCUS post; entitled BTF member → full body; free post → open. *Success: the Zoom-link post is locked for anon.*
2. **Redeploy `wp-articles` (C3)** so the `today` action exists in production, and add "deployed function answers `{action:'today'}` 200" to the cutover/deploy checklist (`docs/wordpress-supabase-cutover.md`). *Success: /today shows real dosha recipes on staging.*
3. **Unblock signup (C2), config half:** decide the email-confirmation policy (see Open decisions). If confirmation stays on, the M4 resend/continue UX becomes mandatory, not optional; until then, consider disabling confirm-email on the staging project so the funnel is testable end-to-end.

### M1 — Client-only perceived performance → C4 (perceived), H4, N1
4. **Instant reader paint.** New `mobile/src/lib/article-preview.ts` (~15-line module `Map<slug, Article>`); card `onPress` in `home.tsx`/`today.tsx` stores the tapped Article; `articles/[slug].tsx` renders hero/category/title/date/excerpt immediately from the preview and spins only where the body goes. `canAccess` (`lib/entitlement.ts:34-38`) predicts the lock panel instantly; the server response stays authoritative. *Success: e2e with a 1.5 s-delayed route shows the title before the response lands. Tap→meaningful paint goes from 2.5–7 s to one frame.*
5. **Tiny TTL cache, not react-query.** New `mobile/src/lib/content-cache.ts` — `cached(key, ttlMs, fetcher)` over a memory Map (5 min TTL), AsyncStorage persistence for the feed-list key only (stale-while-revalidate on cold start), never persist paid bodies, cleared on sign-in/out. Wrap the three fetchers in `lib/articles.ts`. *Success: unit tests (hit/expiry/no-cache-on-reject); e2e counts one `list` call across home→article→back.*
6. **Timeout + real error states (H4).** Wrap `invoke` with an 12 s timeout; distinguish "failed" from "empty" in `home.tsx`/`today.tsx` (error card with a Retry button vs. genuine empty copy). *Success: with the edge route blackholed, the feed shows Retry within 12 s instead of an eternal spinner.*
7. **Quiz progress (N1):** `((current+1)/total)*100` via a pure `quizProgressPct()` in `src/quiz/scoring.ts` + unit tests.

### M2 — Edge function performance & content hygiene → C4 (actual), H1, H2
8. **Right-sized images (H1).** `bestImage()` in `toArticle`: `media_details.sizes.medium_large → large → source_url` fallback; same response field so the app doesn't change. *Success: image URLs carry a `-768x…` suffix; feed payload drops from 6.4 MB to well under 1 MB.*
9. **Collapse the article waterfall (C4).** `Promise.all([findBySlug, resolveTier])`; authenticate the posts-by-slug fetch so `content.rendered` arrives in step one and delete the duplicate post re-fetch (`index.ts:180`); recipes keep their one `la/v1` body call. Gating (`canUnlock`) untouched. *Success: curl gating matrix identical; entitled `article` latency ≥40% lower (target ≤1.5 s warm).*
10. **Sanitize excerpts (H2).** In `toArticle`: strip the Woo "To access this content/post, you must purchase…" tail and decode HTML entities. *Success: no purchase boilerplate or `&ndash;` in any card, member or not.*
11. **60 s warm-isolate cache** for `list`/`today` (module-level Map; never `article`). *Success: second hit within 60 s returns in single-digit ms.*

### M3 — Header unification → H5
12. New `mobile/src/components/AppHeader.tsx` — `{onBack?, title?, right?, dark?, logo?}`, owns `marginBottom: 20` — plus a shared `BackGlyph` (hitSlop 12, `alignSelf:'flex-start'`, `accessibilityLabel="Go back"`). Adopt on 5 screens (reader gets a "Recipe"/"Article" title; account — which also fixes the full-width tap-target bug; edit-answers; today; home hero keeps wordmark+avatar via `logo`/`right`). `OnbTopBar` keeps its API, swaps its inline arrow for `BackGlyph`. Native headers stay off. *Success: one back implementation; jest component test; a click 200 px right of the account arrow does NOT navigate back; visual pass on iOS/Android/web.*

### M4 — Membership paths & auth recovery → C2, C5, H3, H6
13. **Locked-content rescue (H6).** Lock panel: when signed out, primary CTA **"Already a member? Sign in"** → existing migrating sign-in; secondary **"Explore membership"** → `expo-web-browser` to `MEMBERSHIP_URL` (new const in `onboarding/pricing.ts`; URL is an open decision). Fix "article"→"recipe" copy. Same two actions under the "No active subscription." cards on home/account. Never route anyone into `/payment`.
14. **Quarantine the mock payment (C5).** Until real Stripe: replace `/tier→/billing→/payment` in the *new-user* flow with a "Membership opens on lentinealexis.com for now" step (or gate the mock behind a dev flag). Do not collect card digits into a demo form in any build a real user can reach.
15. **Returning-member flow (H3).** Skip quiz-intro/tier-confirm/notifications when the signed-in member already has a subscription + synced prefs (straight to home); never PATCH `notification_prefs` unless the user changed a toggle (hydrate from the fetch already done in `signup.tsx:41-53`).
16. **Signup confirmation UX (C2, app half).** On `!data.session`: "Resend email" (`supabase.auth.resend`, with cooldown) + "I've confirmed — continue" (sign in with held credentials → `/profile`). *Success: e2e with intercepted `auth/v1/signup` (no session) then `auth/v1/token`.*

### M5 — Cutover config
17. Flip `WP_BASE_URL` to CDN-fronted production at launch (staging origin is uncached — part of today's latency); confirm WP Engine caches `wp-json`. Keep M0's deploy-verification step in the checklist.

## Open decisions (owner)

1. **Email confirmation policy** — keep Supabase confirm-email on (then M4's resend/continue is required before any real signup) or off for launch?
2. **Membership URL** — exact lentinealexis.com page for "Explore membership."
3. **Apple 3.1.1** — an external purchase link for digital content risks App Store rejection. Option: iOS-only copy variant ("Membership is managed on lentinealexis.com", no tappable link — the reader-app pattern). Build the CTA one conditional away from hidden; decide before iOS submission.
4. **White cards on taupe** (N6) — keep (and amend the design system) or restyle?
5. **Post gating source of truth** — confirm the Woo Memberships rules are what `visibility` should mirror for posts (C1 fix depends on it).

## Measurement appendix

- Feed `list` edge call: 0.39 / 0.42 / 0.44 s (curl); in-app feed rendered ~1.1–1.5 s after landing on home (3 runs), before images.
- Feed images: 6.4 MB total for 12 cards (max single file 1.19 MB, `-scaled` 2560 px originals).
- Entitled recipe `article`: 3.49 / 2.52 / 2.51 s (curl); 7.0 s observed in-app including edge cold start.
- Anonymous "free" post `article`: 5.39 / 2.00 / 2.17 s.
- Anonymous locked `article`: 0.50 / 0.64 / 0.48 s.
- `today` action: HTTP 400 `unknown action` × 3 (deployed function stale).
- Test account used: lexidupont@gmail.com (subscription "Recipe Club, billed yearly, renews Feb 2 2027" verified in-app). Side effect of the audit run: its notification prefs were set to all-off by the H3 bug — restore them after the fix, and it's one more piece of evidence.
