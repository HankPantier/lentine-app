-- 0003 — Persist the Dosha quiz result on profiles
-- Paste this whole file into the Supabase SQL editor (STAGING project) and run it.
-- Additive and safe to re-run (all guarded with `if not exists`).
--
-- The Dosha result was previously held only in the app's local AsyncStorage, so it was
-- lost on reinstall or a sign-in from another device. These columns make Supabase the one
-- source of truth for a member's constitution — readable later by the web/WP bridge too.
--
-- No new RLS is needed: the existing "profiles: read own" (0001) and "profiles: update own"
-- (0002) policies already let a signed-in user read and write these columns on their own row.
-- Writes still come from the authenticated client (the member taking the quiz), never from
-- other users — RLS scopes every read/write to auth.uid() = id.

alter table public.profiles
  add column if not exists primary_dosha  text
    check (primary_dosha in ('vata', 'pitta', 'kapha')),
  add column if not exists dosha_scores   jsonb,          -- e.g. {"vata":5,"pitta":4,"kapha":3}
  add column if not exists dosha_taken_at timestamptz;     -- when the quiz was last completed
