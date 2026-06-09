# wordpress/ — PHP Bridge for the Live Site

Keeps the existing WordPress front end working after auth/subscriptions move to Supabase.
Built as a **mu-plugin** so it survives theme updates and stays isolated from theme code.

## What it does

1. Authenticates WP login against Supabase Auth (`signInWithPassword`)
2. Stores the returned JWT in a secure, httpOnly cookie
3. Looks up the user's tier from the Supabase `subscriptions` table
4. Exposes a helper the theme uses to gate content

## Helpers

- `btf_supabase_sign_in( $email, $password )` — authenticate, return tokens
- `btf_get_subscription_tier( $supabase_uid )` — return tier slug
- `btf_user_has_tier( $slug )` — boolean gate used in templates

## Migration task

Audit and replace every `wc_memberships_*` call in the theme with `btf_user_has_tier()`.
Full-text search the theme dir first; change only the gating calls (surgical — see
../CLAUDE.md).

## Layout

- `mu-plugins/` — the bridge plugin (drop into `wp-content/mu-plugins/` on the live site)

> Credentials (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) go in
> `wp-config.php` on the server — never committed here.
> Build and test on WP **staging** before touching production.
