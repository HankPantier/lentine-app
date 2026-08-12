-- Synced search index for the app's full-catalog search.
--
-- The wp-articles `search` action used to hit WordPress REST `?search=` live on every query:
-- slow (4-8s cold), capped at 10 items/type, and blind to recipe ingredients/instructions
-- (those live in ACF, which WP's search doesn't index). This table is a fresh mirror of the
-- whole catalog, refreshed by the `sync-content` edge function (cron + on WP publish), that the
-- search action queries with Postgres full-text search instead — fast, complete, and able to
-- match on ingredient/instruction text.
--
-- `summary` holds the same public Article shape the app already renders (NO gated bodies —
-- those never leave the `article` action). `search_text` is the FTS corpus: title + excerpt +
-- category + dosha/season + the recipe's ingredient/instruction text. `search_tsv` is derived
-- from it and GIN-indexed. Service-role only (RLS on, no policies): the app never reads this
-- table directly — it goes through the wp-articles edge function, which returns only summaries.

create table if not exists public.content_index (
  type       text not null,             -- 'post' | 'recipe'
  id         bigint not null,           -- WordPress post id
  slug       text not null,
  summary    jsonb not null,            -- normalized Article summary (public; no gated body)
  date       timestamptz not null,      -- publish date, for newest-first ordering
  visibility text not null,             -- 'free' | 'paid' (mirrors summary.visibility)
  search_text text not null default '', -- FTS corpus (incl. recipe ingredients/instructions)
  search_tsv tsvector generated always as (to_tsvector('english', search_text)) stored,
  updated_at timestamptz not null default now(),
  primary key (type, id)
);

-- Full-text matching (websearch_to_tsquery) rides this GIN index.
create index if not exists content_index_search_tsv_idx
  on public.content_index using gin (search_tsv);

-- Newest-first ordering of results.
create index if not exists content_index_date_idx
  on public.content_index (date desc);

-- Service-role only: RLS on with no policies denies anon and authenticated entirely.
alter table public.content_index enable row level security;
