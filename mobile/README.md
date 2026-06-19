# mobile/ — Lentine Alexis App (Expo, iOS + Android + Web)

Cross-platform app from a **single Expo codebase** (Expo Router + React Native Web).
Milestone 1 ships the **new-user onboarding flow** with the real **12-question dosha quiz**,
running on local/mocked state — no backend yet (Supabase auth, Stripe billing, and the
WordPress content layer arrive in later milestones).

## Run it

```bash
cd mobile
npm install        # first time
npm run web        # opens in the browser (http://localhost:8081)
npm run ios        # iOS simulator / Expo Go
npm run android    # Android emulator / Expo Go
npm test           # jest — quiz scoring + data-integrity tests
npx tsc --noEmit   # typecheck
```

## Layout

```
src/
  app/                 Expo Router routes (file = screen)
    _layout.tsx        loads Mulish fonts, wraps OnboardingProvider, Stack
    index.tsx          splash
    signup · profile · quiz · result · tier · billing · payment · notifications · home
  components/          design-system primitives (Button, Field, Eyebrow, ProgressDots,
                       Wordmark, Rule, Heading, Screen/DarkScreen/OnbTopBar, Text)
  theme/tokens.ts      brand tokens (colors, fonts, spacing, radii) — single source of truth
  quiz/                questions.ts · doshas.ts (ported from prototypes/dosha-quiz.html),
                       scoring.ts (pure, unit-tested), scoring.test.ts
  onboarding/          state.tsx (Context + reducer + AsyncStorage), steps.ts, pricing.ts
```

## Conventions

- **TypeScript**, strict. Path alias `@/*` → `src/*`.
- **Styling:** `StyleSheet`/inline styles driven by `theme/tokens.ts` (not NativeWind).
- **Font:** Mulish stands in for the licensed Galano Classic (the design system's named
  free fallback). Swap in Galano once licensing is sorted.
- **State:** all onboarding state lives in `OnboardingProvider`, persisted to AsyncStorage
  (localStorage on web) under `la_onb_state_v1`.
- **Brand:** navy `#000033`, taupe `#f4f0ec`, teal `#3FBECC`; sharp corners; italic-uppercase
  CTAs; small-caps eyebrows. See `../raw/lentine-alexis-design-system.md`.

## Flows

- **New member:** splash → sign-up → profile → quiz → result → tier → billing → payment → notifications → home
- **Returning member** ("Already a member? Sign in"): sign-in → quiz → result → confirm membership → notifications → home (skips profile + tier/billing/payment). The existing subscription on the confirm screen is **mocked** until real auth lands.

## Not in M1 (next milestones)

Real Supabase auth (the returning-member identity + subscription are mocked), password
reset, Stripe billing, WordPress (WPGraphQL) content + tier gating, and resume-to-screen
routing on reload. Dosha result currently lives only in local state — persisting it needs a
`profiles.dosha` column (M2).
