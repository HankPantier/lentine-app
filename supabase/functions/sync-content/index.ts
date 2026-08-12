// sync-content — mirrors the WordPress catalog into the content_index table for search.
//
// The wp-articles `search` action queries content_index (Postgres FTS) instead of hitting
// WordPress live. This function keeps that mirror fresh: it pulls EVERY published post and
// recipe from WP REST (authenticated, paginated), normalizes each to the app's Article shape,
// builds the FTS corpus (title + excerpt + category + dosha/season + recipe ingredient/
// instruction text), and upserts into content_index — deleting rows for items no longer
// published.
//
// Invoked by pg_cron on a schedule (and optionally by a WordPress publish webhook). Guarded by
// a shared secret so the endpoint isn't open. Deploy WITHOUT gateway JWT verification:
//   supabase functions deploy sync-content --no-verify-jwt
//   supabase secrets set SYNC_SECRET=<random>  WP_BASE_URL=... WP_USER=... WP_APP_PASSWORD=...
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-provisioned in the runtime.)

import { createClient } from 'npm:@supabase/supabase-js@2';
import { type Article, type ContentType, stripHtml, toArticle } from '../_shared/wp-normalize.ts';

const WP_BASE_URL = Deno.env.get('WP_BASE_URL') ?? '';
const WP_USER = Deno.env.get('WP_USER') ?? '';
const WP_APP_PASSWORD = Deno.env.get('WP_APP_PASSWORD') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SYNC_SECRET = Deno.env.get('SYNC_SECRET') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function wpUrl(path: string): string {
  return `${WP_BASE_URL}/wp-json/wp/v2/${path}`;
}

function basicAuthHeaders(): Record<string, string> {
  return WP_USER && WP_APP_PASSWORD
    ? { Authorization: `Basic ${btoa(`${WP_USER}:${WP_APP_PASSWORD}`)}` }
    : {};
}

function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

const PER_PAGE = 100;
const MAX_PAGES = 50; // hard backstop: 50 * 100 = 5000 items per type

/**
 * Every published item of a type, fetched AUTHENTICATED (so full post bodies arrive, and the
 * mu-plugin's auth-only recipe `search_text` field is populated), paginated to exhaustion. WP
 * returns HTTP 400 (rest_post_invalid_page_number) once the page passes the last one.
 */
// deno-lint-ignore no-explicit-any
async function fetchAll(type: ContentType): Promise<any[]> {
  const base = type === 'recipe' ? 'recipe' : 'posts';
  const out: any[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(
      wpUrl(`${base}?_embed=1&per_page=${PER_PAGE}&page=${page}&orderby=date&order=desc`),
      { headers: basicAuthHeaders() },
    );
    if (res.status === 400) break; // past the last page
    if (!res.ok) throw new Error(`WP ${base} page ${page}: HTTP ${res.status}`);
    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) break;
    out.push(...items);
    if (items.length < PER_PAGE) break;
  }
  return out;
}

/** The searchable plain-text body for an item. */
// deno-lint-ignore no-explicit-any
function bodyText(item: any, type: ContentType): string {
  if (type === 'recipe') {
    // Provided by the mu-plugin's auth-only `search_text` REST field (assembled ACF body,
    // tags stripped). Absent → the recipe still indexes on its title/excerpt/tags.
    return String(item?.search_text ?? '');
  }
  return stripHtml(String(item?.content?.rendered ?? ''));
}

/** The FTS corpus for an item: title + excerpt + category + dosha/season + body text. */
function searchCorpus(summary: Article, body: string): string {
  return [
    summary.title,
    summary.excerpt,
    summary.category ?? '',
    summary.dosha.join(' '),
    summary.season.join(' '),
    body,
  ]
    .filter((s) => s && s.trim().length > 0)
    .join('\n');
}

/** Sync one post type into content_index; returns how many rows were upserted. */
async function syncType(type: ContentType): Promise<number> {
  const items = await fetchAll(type);
  const admin = adminClient();
  const now = new Date().toISOString();

  const rows = items.map((item) => {
    const summary = toArticle(item, type);
    return {
      type,
      id: summary.id,
      slug: summary.slug,
      summary,
      date: summary.date,
      visibility: summary.visibility,
      search_text: searchCorpus(summary, bodyText(item, type)),
      updated_at: now,
    };
  });

  // Upsert in chunks (PostgREST caps payload size).
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await admin.from('content_index').upsert(chunk, { onConflict: 'type,id' });
    if (error) throw new Error(`upsert ${type}: ${error.message}`);
  }

  // Drop rows for items no longer published (skip when the fetch returned nothing — never wipe
  // the index on a transient empty read; fetchAll throws on a real WP error before reaching here).
  if (rows.length > 0) {
    const ids = rows.map((r) => r.id);
    const { error } = await admin
      .from('content_index')
      .delete()
      .eq('type', type)
      .not('id', 'in', `(${ids.join(',')})`);
    if (error) throw new Error(`prune ${type}: ${error.message}`);
  }

  return rows.length;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  if (!WP_BASE_URL) return json({ error: 'WP_BASE_URL not configured' }, 500);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json({ error: 'Supabase env not configured' }, 500);
  // The endpoint must never be open: refuse unless the shared secret is set AND matches.
  if (!SYNC_SECRET) return json({ error: 'SYNC_SECRET not configured' }, 500);
  if (req.headers.get('x-sync-secret') !== SYNC_SECRET) return json({ error: 'unauthorized' }, 401);

  try {
    const [posts, recipes] = await Promise.all([syncType('post'), syncType('recipe')]);
    return json({ ok: true, synced: { post: posts, recipe: recipes } });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 502);
  }
});
