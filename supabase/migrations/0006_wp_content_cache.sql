-- Shared cache for WordPress content fetched by the wp-articles edge function.
-- The function's in-isolate Map only helps when a request happens to land on a warm
-- isolate; this table is the cross-isolate copy, read/written with the service role only.
-- Rows are upserted with a fresh fetched_at; the function treats them as stale after its
-- TTL and revalidates in the background (stale-while-revalidate).

create table if not exists public.wp_content_cache (
  key        text primary key,          -- e.g. 'article:<slug>'
  payload    jsonb not null,            -- entitlement-INDEPENDENT WP data (summary + body)
  fetched_at timestamptz not null default now()
);

-- Service-role only: RLS on with no policies denies anon and authenticated entirely.
-- Paid bodies live in payload — they must never be readable through the public API.
alter table public.wp_content_cache enable row level security;
