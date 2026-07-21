-- 0008 — Persist favorited recipes on profiles
-- Paste this whole file into the Supabase SQL editor (STAGING project) and run it.
-- Additive and safe to re-run.
--
-- Stores the member's favorited recipes as a JSON array of card snapshots:
--   [{ "slug": "golden-milk", "id": 101, "title": "Golden Milk", "image": "...",
--      "category": "Drinks", "type": "recipe", "dosha": ["vata"], "season": ["winter"],
--      "savedAt": "2026-07-21T10:00:00.000Z" }, ...]
-- Written from the recipe reader's heart toggle; read by the /favorites screen. Entries are
-- validated/coerced client-side (see lib/favorites-encoding.ts asFavorites), so unknown or
-- malformed entries are dropped on read. Defaults to '[]' — no favorites yet.
--
-- No new RLS needed: the existing "profiles: read own" / "profiles: update own" policies already
-- scope reads and writes to the member's own row.

alter table public.profiles
  add column if not exists favorites jsonb not null default '[]'::jsonb;
