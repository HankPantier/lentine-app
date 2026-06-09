# mobile/ — Expo App (iOS + Android)

The deliverable. A cross-platform Expo / React Native app mirroring the gated Lentine
Alexis website experience.

## Planned stack (from migration outline)

| Concern | Choice |
|---|---|
| Framework | Expo (SDK 51+) + Expo Router |
| Auth | `@supabase/supabase-js` + AsyncStorage session |
| Content | WordPress via WPGraphQL (`graphql-request` or `urql`) |
| Payments | `@stripe/stripe-react-native` |
| State | Zustand or React Context |
| Styling | NativeWind (Tailwind for RN) — to reproduce the design system |
| Push | Expo Notifications + Supabase Edge Function |

## Content gating

App enforces gating against the **Supabase subscription record**, not WordPress:

- Recipes → `recipe` and `back_to_forward` tiers
- Back to Forward → `back_to_forward` only

WordPress is treated as a content API.

> Not scaffolded yet. `npx create-expo-app` once the Supabase foundation is in place.
