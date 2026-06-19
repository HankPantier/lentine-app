-- Seed the two subscription tiers. Idempotent: safe to re-run.
-- back_to_forward is the higher tier (includes recipe access).
insert into public.subscription_tiers (slug, name, description) values
  ('recipe',          'Recipe',          'Recipe content access'),
  ('back_to_forward', 'Back to Forward', 'Recipe content + Back to Forward content')
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description;
