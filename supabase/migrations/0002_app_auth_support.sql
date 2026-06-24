-- 0002 — App auth support (login testing + client sign-up)
-- Paste this whole file into the Supabase SQL editor (STAGING project) and run it.
-- It does three things, all safe to re-run:
--   1. Sets a known password on one real ACTIVE subscriber so we can test sign-in
--      (Flow 1). The final SELECT returns the email to use.
--   2. Adds a guarded trigger so client sign-ups (Flow 2) get a profiles row — RLS
--      blocks client-side inserts. The guard skips migrated users so the migration
--      loader is unaffected.
--   3. Adds a profiles UPDATE policy so a signed-in user can save their own name.
--
-- One thing this file CANNOT do: hand you the anon/publishable key. That is a project
-- API key, not a DB value — copy it from Project Settings → API → `anon` public into
-- mobile/.env as EXPO_PUBLIC_SUPABASE_ANON_KEY.

-- ---------------------------------------------------------------------------
-- 1. Test password on a real active subscriber (Flow 1)
--    bcrypt via pgcrypto; schema-qualified because the SQL editor's search_path
--    does not always include the extensions schema.
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;

with target as (
  select u.id, u.email
  from auth.users u
  join public.subscriptions s on s.user_id = u.id
  where s.status = 'active'
  order by s.current_period_end desc nulls last
  limit 1
)
update auth.users
set encrypted_password = extensions.crypt('LentineTest123!', extensions.gen_salt('bf'))
from target
where auth.users.id = target.id
returning auth.users.email;   -- ← Flow 1: sign in with THIS email + password "LentineTest123!"

-- ---------------------------------------------------------------------------
-- 2. Auto-create a profile for new client sign-ups (Flow 2)
--    SECURITY DEFINER so it bypasses RLS. Guarded: migrated users carry
--    `wp_user_id` in user metadata and are owned by the migration loader, so we
--    skip them here (prevents any interference with `npm run load`).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data ? 'wp_user_id' then
    return new;  -- migrated subscriber: the loader owns this profile row
  end if;
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 3. Let a signed-in user update their OWN profile (Flow 2 name save, Flow 3)
--    Reads stay restricted by the existing "profiles: read own" policy; this only
--    adds self-service UPDATE. Still no client INSERT/DELETE (service role only).
-- ---------------------------------------------------------------------------
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
