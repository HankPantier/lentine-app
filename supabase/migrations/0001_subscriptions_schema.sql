-- 0001 — Auth + subscription foundation (profiles, subscription_tiers, subscriptions)
-- One source of truth for tier; both the app and the WP PHP bridge read from here.
-- See raw/migration-architecture-outline.md for column rationale.
--
-- RLS is mandatory: users may read ONLY their own profile/subscription; tiers are public
-- read. NO write policies exist, so only the service role (which bypasses RLS) can write —
-- the migration loader and Stripe webhooks. Subscription rows must never be client-writable.

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — one row per user, extends auth.users
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null unique,
  display_name text not null,
  wp_user_id   integer unique,                 -- preserved for sync; null after full cut-over
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- subscription_tiers — static lookup (recipe, back_to_forward)
-- ---------------------------------------------------------------------------
create table public.subscription_tiers (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,            -- 'recipe' | 'back_to_forward'
  name        text not null,
  description text
);

-- ---------------------------------------------------------------------------
-- subscriptions — one active row per user
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.profiles (id) on delete cascade,
  tier_id                uuid not null references public.subscription_tiers (id),
  status                 text not null check (status in ('active', 'cancelled', 'past_due', 'trialing')),
  billing_interval       text not null check (billing_interval in ('month', 'year')),
  current_period_start   timestamptz,
  current_period_end     timestamptz,          -- existing renewal dates honoured
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  wp_subscription_id     integer unique,        -- idempotency key for the migration loader
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index subscriptions_user_id_idx on public.subscriptions (user_id);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.subscription_tiers  enable row level security;
alter table public.subscriptions       enable row level security;

-- Users read their own profile.
create policy "profiles: read own"
  on public.profiles for select
  using (auth.uid() = id);

-- Tiers are public read (any authenticated user may resolve a slug/name).
create policy "tiers: read all"
  on public.subscription_tiers for select
  to authenticated
  using (true);

-- Users read their own subscription.
create policy "subscriptions: read own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- No insert/update/delete policies anywhere: writes go through the service role only.
