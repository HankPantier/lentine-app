# Working Agreement — Lentine Alexis Project

The goal is a cross-platform iOS + Android app (Expo) tying into the live Lentine Alexis
WordPress site. Supabase (auth/subscriptions), Stripe (billing), and the WordPress PHP
bridge are the foundation. See [README.md](README.md) for full architecture.

## Coding discipline (Karpathy-derived, tailored to this project)

1. **Think before coding.** State assumptions explicitly and ask before guessing. The data
   model touches real money and 523 real subscribers — a wrong assumption is expensive.

2. **Simplicity first.** Build only what's asked. No speculative abstractions, no
   "while we're here" features. This is a migration, not a greenfield rewrite.

3. **Surgical changes.** Touch only what's necessary and match existing style. This applies
   *especially* to the live WordPress theme — change the auth/gating path and nothing else.
   Do not refactor unrelated PHP, do not "tidy" the theme.

4. **Goal-driven execution.** Define a verifiable success criterion before starting
   (e.g. "523 users imported, counts match", "logged-in subscriber sees gated recipe on
   both web and app") and verify against it before calling something done.

5. **Work the loop; evidence before "ready."** Always run a tight loop —
   **write → review → debug → test → repeat** — until the work is actually correct. Only
   then report something as ready, and only with evidence (tests pass, the app runs, the
   flow is verified, e.g. a browser click-through). Never claim success on an unverified
   change.

## Project-specific guardrails

- **The WordPress site is LIVE with paying subscribers.** Build and test against staging
  first. Never run migration or schema changes directly against production without an
  explicit go-ahead and a backup.
- **Secrets never get committed.** `SUPABASE_SERVICE_ROLE_KEY`, Stripe secret keys, and
  DB credentials live in env/local config only — never in tracked files. See `.gitignore`.
- **One source of truth for tier.** Auth + subscription state lives in Supabase. Both the
  site (via PHP bridge) and the app read from it. Don't reintroduce WooMemberships logic.
- **Honor existing renewal dates and Stripe customer IDs** during migration — the goal is a
  silent cut-over with no card re-entry for existing subscribers where possible.
- **Stay on-brand.** The app mirrors the current site. Follow `raw/lentine-alexis-design-system.md`
  (navy #000033, taupe #f4f0ec, teal #3FBECC, Galano Classic, sharp corners, italic
  uppercase CTAs).
- **Two clients, one contract.** Changes to the Supabase schema or tier logic affect both
  the website and the app — consider both before changing shared structures.
