-- 0004 — Persist the per-question Dosha answers on profiles
-- Paste this whole file into the Supabase SQL editor (STAGING project) and run it.
  -- Additive and safe to re-run.
--
-- 0003 stored the result (primary + tally). This stores the raw answers behind it so the
-- quiz can be re-loaded and edited later: a JSON array, one entry per question, each the
-- dosha that question's chosen option scored toward ('vata'|'pitta'|'kapha') or null if
-- unanswered — e.g. ["vata","pitta",null,...]. Indexed to the QUESTIONS order in the app.
-- Each question has exactly one option per dosha, so the dosha key uniquely identifies the
-- chosen option; that's enough to reconstruct the selection and recompute the result.
--
-- No new RLS needed: the existing "profiles: read own" / "profiles: update own" policies
-- already scope reads and writes to the member's own row.

alter table public.profiles
  add column if not exists dosha_answers jsonb;
