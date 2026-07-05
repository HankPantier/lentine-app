-- 0005 — Persist notification preferences on profiles
-- Paste this whole file into the Supabase SQL editor (STAGING project) and run it.
-- Additive and safe to re-run.
--
-- Stores which categories a member wants notifications for, as a small JSON object of booleans:
--   { "rituals": true, "recipes": true, "btf": false }
-- Written from the onboarding "Stay connected" screen and the account screen. Missing keys are
-- defaulted client-side (see lib/notification-prefs.ts normalizePrefs), so a partial/empty object
-- is fine. Defaults to '{}' so existing rows read as "all opted-in" until the member sets them.
--
-- No new RLS needed: the existing "profiles: read own" / "profiles: update own" policies already
-- scope reads and writes to the member's own row.

alter table public.profiles
  add column if not exists notification_prefs jsonb not null default '{}'::jsonb;
