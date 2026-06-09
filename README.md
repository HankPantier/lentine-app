# Lentine Alexis — Cross-Platform App & Site Migration

**North star:** ship a cross-platform mobile app (iOS + Android, Expo / React Native) that ties into the existing Lentine Alexis WordPress site and delivers gated content (Recipes + "Back to Forward") to subscribers.

Everything else is the foundation the app stands on.

## Architecture

```
WordPress (content CMS + live public site, stays)
        │  WPGraphQL / REST
        ▼
   Supabase (auth + subscriptions) ── Stripe (billing)
        │
        ├──► iOS + Android app   ◄── the deliverable
        └──► WordPress front end (PHP bridge keeps the live site working)
```

- **WordPress stays live** as the CMS and public site. The (non-technical) client keeps authoring recipes + Back to Forward content in the editor they know. No new CMS, no content migration.
- **Supabase** owns auth + subscription state (WooCommerce/WooMemberships can't cleanly serve a mobile client).
- **Stripe** takes over billing from WooPayments.
- A **WordPress PHP bridge** rewires the live site's auth/gating to Supabase so site and app share one source of truth.

**Scale:** 2 paid tiers (Recipe, Back to Forward) × monthly/annual · ~523 active subscribers · no free tier.

## Workstreams (build order)

| Dir | What | Phase |
|---|---|---|
| `supabase/` | Auth + subscription schema, RLS, Stripe webhook edge functions | 1–2 (foundation) |
| `migration/` | One-time WP → Supabase data migration scripts | 1 |
| `wordpress/` | The live WP site (copied from Local). Only our theme + the PHP bridge mu-plugin are tracked — see [docs/wordpress-bridge.md](docs/wordpress-bridge.md) | 3 |
| `mobile/` | Expo app — iOS + Android (the goal) | 4 |
| `raw/` | Source material: specs, design system, DB export, assets | input |

## Working agreement

See [CLAUDE.md](CLAUDE.md) for the coding discipline this project follows.
