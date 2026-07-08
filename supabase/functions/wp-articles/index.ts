// wp-articles — the app's content seam to WordPress.
//
// Three actions over POST:
//   { action: 'list', perPage? }      → public: recent POSTS + RECIPES, merged, newest-first.
//                                        Each item carries `type` ('post'|'recipe') and
//                                        `visibility` ('free'|'paid') so the app draws lock badges.
//   { action: 'today', dosha, perPage? } → public: recipes matched to the member's dosha.
//   { action: 'article', slug }       → tier-gated: the full body ONLY when the caller's Supabase
//                                        subscription TIER permits it (see canUnlock).
//
// list/today responses are cached in warm-isolate memory for 60s; article never is.
//
// Why this shape: the live WordPress site gates bodies server-side, so a full body needs an
// authenticated WP request. Auth + entitlement live in Supabase, so we keep the WordPress
// credential here (server-side) and let SUPABASE decide who is entitled — verifying the caller's
// JWT and resolving their tier. Recipes are a custom post type whose body lives in ACF fields, so
// their assembled HTML comes from a small auth-only WP route (la/v1/recipe/<slug>); posts use the
// standard REST `content.rendered`.
//
// Deploy with JWT verification OFF at the gateway (the 'list' action must work anonymously);
// the 'article' action verifies the JWT itself:
//   supabase functions deploy wp-articles --no-verify-jwt
//   supabase secrets set WP_BASE_URL=https://lentinealexis.com WP_USER=... WP_APP_PASSWORD=...
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-provisioned in the function runtime.

import { createClient } from 'npm:@supabase/supabase-js@2';

const WP_BASE_URL = Deno.env.get('WP_BASE_URL') ?? '';
const WP_USER = Deno.env.get('WP_USER') ?? '';
const WP_APP_PASSWORD = Deno.env.get('WP_APP_PASSWORD') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const ENTITLING_STATUSES = ['active', 'trialing'];
const DEFAULT_PER_PAGE = 10;

type Tier = 'recipe' | 'back_to_forward';
type ContentType = 'post' | 'recipe';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/**
 * Warm-isolate response cache for the anonymous list/today actions (module state survives
 * across invocations while the isolate is warm). Each one costs 24 `_embed` WP fetches against
 * an uncached origin — with a 60s TTL repeat opens skip WordPress entirely. NEVER cache
 * `article`: its response depends on the caller's entitlement.
 */
const RESPONSE_CACHE_TTL_MS = 60_000;
const responseCache = new Map<string, { at: number; body: string }>();

function cachedResponse(key: string): Response | null {
  const hit = responseCache.get(key);
  if (!hit || Date.now() - hit.at >= RESPONSE_CACHE_TTL_MS) return null;
  return new Response(hit.body, { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

function cacheAndRespond(key: string, payload: unknown): Response {
  const body = JSON.stringify(payload);
  responseCache.set(key, { at: Date.now(), body });
  return new Response(body, { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  nbsp: ' ',
  hellip: '…',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  quot: '"',
};

/** Strip tags, decode entities, collapse whitespace — plain text for cards. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&([a-z]+);/gi, (m: string, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A card-ready excerpt. WooCommerce Memberships appends its purchase pitch ("To access this
 * content, you must purchase Recipe Club Subscription – Monthly, …") to every restricted
 * excerpt — pure noise on a card (the lock badge already communicates gating) and it shows
 * even to entitled members. Cut it.
 */
function cardExcerpt(html: string): string {
  return stripHtml(html)
    .replace(/\s*To access this (content|post|recipe)\b.*$/i, '')
    .trim();
}

/** Normalize the per-item `visibility` REST field to the app's two values; default `paid` (fail safe). */
function readVisibility(post: { visibility?: unknown }): 'free' | 'paid' {
  return post?.visibility === 'free' ? 'free' : 'paid';
}

/**
 * The category label for a card. Posts carry it via the embedded `category` taxonomy term;
 * recipes have no taxonomy — their category is the ACF `category` field exposed by the mu-plugin
 * (a label string or an array of labels).
 */
// deno-lint-ignore no-explicit-any
function readCategory(post: any, type: ContentType): string | null {
  if (type === 'recipe') {
    const c = post?.category;
    if (Array.isArray(c)) return (c[0] as string | undefined) ?? null;
    return (typeof c === 'string' && c) ? c : null;
  }
  const term = post?._embedded?.['wp:term']?.flat?.().find?.((t: any) => t?.taxonomy === 'category');
  return (term?.name as string | undefined) ?? null;
}

/**
 * A bounded image for a ~180-200pt card/hero — the originals are 2560px multi-MB "-scaled"
 * uploads (the feed shipped 6.4 MB of images for 12 cards). `_embed` already includes the
 * generated sizes; fall back to the original only when WP made no intermediate sizes (small
 * uploads, SVGs, disabled thumbnails).
 */
// deno-lint-ignore no-explicit-any
function bestImage(media: any): string | null {
  const sizes = media?.media_details?.sizes;
  return (
    (sizes?.medium_large?.source_url as string | undefined) ?? // 768w — plenty at 2-3x DPR
    (sizes?.large?.source_url as string | undefined) ?? // 1024w
    (media?.source_url as string | undefined) ??
    null
  );
}

/** Normalize a WP REST post/recipe (fetched with _embed) into the app's Article shape. */
// deno-lint-ignore no-explicit-any
function toArticle(post: any, type: ContentType) {
  const media = post?._embedded?.['wp:featuredmedia']?.[0];
  return {
    id: post.id as number,
    slug: post.slug as string,
    type,
    visibility: readVisibility(post),
    title: stripHtml(post?.title?.rendered ?? ''),
    excerpt: cardExcerpt(post?.excerpt?.rendered ?? ''),
    image: bestImage(media),
    category: readCategory(post, type),
    date: post.date as string,
    link: post.link as string,
    // Lowercased ACF dosha tags (recipes; posts have none) — drives the home
    // "For your <Dosha>" section client-side.
    dosha: readDoshas(post),
  };
}

/** Whether `tier` unlocks an item. Mirrors the app's entitlement.canAccess EXACTLY — keep in sync. */
function canUnlock(type: ContentType, visibility: 'free' | 'paid', tier: Tier | null): boolean {
  if (visibility === 'free') return true;
  if (type === 'recipe') return tier === 'recipe' || tier === 'back_to_forward';
  return tier === 'back_to_forward';
}

function wpUrl(path: string): string {
  return `${WP_BASE_URL}/wp-json/wp/v2/${path}`;
}

function basicAuthHeaders(): Record<string, string> {
  if (WP_USER && WP_APP_PASSWORD) {
    return { Authorization: `Basic ${btoa(`${WP_USER}:${WP_APP_PASSWORD}`)}` };
  }
  return {};
}

/** Verify the caller's JWT and resolve their entitling subscription tier, or null. */
async function resolveTier(authHeader: string | null): Promise<Tier | null> {
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token || !SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) return null;
  const { data: sub } = await admin
    .from('subscriptions')
    .select('status, subscription_tiers(slug)')
    .eq('user_id', userData.user.id)
    .in('status', ENTITLING_STATUSES)
    .maybeSingle();
  // deno-lint-ignore no-explicit-any
  const slug = (sub as any)?.subscription_tiers?.slug as string | undefined;
  return slug === 'recipe' || slug === 'back_to_forward' ? slug : null;
}

/** The recipe's dosha labels, lowercased (ACF `dosha` array field, e.g. ["Vata","Pitta"]). */
// deno-lint-ignore no-explicit-any
function readDoshas(post: any): string[] {
  const d = post?.dosha;
  return Array.isArray(d) ? d.map((x: unknown) => String(x).toLowerCase()) : [];
}

/** Fetch the most recent items of a post type, normalized; [] on any WP error. */
async function fetchType(type: ContentType, perPage: number) {
  const base = type === 'recipe' ? 'recipe' : 'posts';
  const res = await fetch(wpUrl(`${base}?_embed=1&per_page=${perPage}&orderby=date&order=desc`));
  if (!res.ok) return [];
  const items = await res.json();
  return Array.isArray(items) ? items.map((p) => toArticle(p, type)) : [];
}

/**
 * Find a single item by slug across both post types; returns the raw WP object + its type.
 * The posts fetch is AUTHENTICATED so `content.rendered` arrives complete in this one request
 * (Memberships truncates it for anonymous callers) — the gate is unaffected because the body
 * is only ever *returned* after canUnlock passes. This used to be a second, duplicate WP
 * round-trip per post open.
 */
async function findBySlug(slug: string): Promise<{ post: unknown; type: ContentType } | null> {
  const [postRes, recipeRes] = await Promise.all([
    fetch(wpUrl(`posts?_embed=1&slug=${encodeURIComponent(slug)}`), { headers: basicAuthHeaders() }),
    fetch(wpUrl(`recipe?_embed=1&slug=${encodeURIComponent(slug)}`)),
  ]);
  const postArr = postRes.ok ? await postRes.json() : [];
  if (Array.isArray(postArr) && postArr[0]) return { post: postArr[0], type: 'post' };
  const recipeArr = recipeRes.ok ? await recipeRes.json() : [];
  if (Array.isArray(recipeArr) && recipeArr[0]) return { post: recipeArr[0], type: 'recipe' };
  return null;
}

/** The assembled body of an unlocked recipe (recipes have no `content` — it lives in ACF). */
async function fetchRecipeBody(slug: string): Promise<string> {
  const res = await fetch(`${WP_BASE_URL}/wp-json/la/v1/recipe/${encodeURIComponent(slug)}`, {
    headers: basicAuthHeaders(),
  });
  if (!res.ok) return '';
  const data = await res.json();
  return (data?.recipe_body as string | undefined) ?? '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  if (!WP_BASE_URL) return json({ error: 'WP_BASE_URL not configured' }, 500);

  let body: { action?: string; slug?: string; perPage?: number; dosha?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid JSON body' }, 400);
  }

  // --- list (public): merged posts + recipes, newest-first ---
  if (body.action === 'list') {
    const perPage = Math.min(Math.max(body.perPage ?? DEFAULT_PER_PAGE, 1), 30);
    const cacheKey = `list:${perPage}`;
    const cached = cachedResponse(cacheKey);
    if (cached) return cached;
    const [posts, recipes] = await Promise.all([fetchType('post', perPage), fetchType('recipe', perPage)]);
    const articles = [...posts, ...recipes]
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .slice(0, perPage);
    return cacheAndRespond(cacheKey, { articles });
  }

  // --- today (public): recipes matched to the member's dosha, newest-first ---
  // The ACF `dosha` field isn't a queryable taxonomy, so we pull recent recipes and filter here.
  // Items carry visibility so the app draws lock badges; bodies stay gated behind `article`.
  if (body.action === 'today') {
    const dosha = String(body.dosha ?? '').toLowerCase();
    if (dosha !== 'vata' && dosha !== 'pitta' && dosha !== 'kapha') {
      return json({ error: 'invalid dosha' }, 400);
    }
    const perPage = Math.min(Math.max(body.perPage ?? 6, 1), 12);
    const cacheKey = `today:${dosha}:${perPage}`;
    const cached = cachedResponse(cacheKey);
    if (cached) return cached;
    const res = await fetch(wpUrl('recipe?_embed=1&per_page=24&orderby=date&order=desc'));
    if (!res.ok) return json({ articles: [] });
    const items = await res.json();
    const articles = (Array.isArray(items) ? items : [])
      .filter((p) => readDoshas(p).includes(dosha))
      .slice(0, perPage)
      .map((p) => toArticle(p, 'recipe'));
    return cacheAndRespond(cacheKey, { articles });
  }

  // --- article (tier-gated) ---
  if (body.action === 'article') {
    if (!body.slug) return json({ error: 'slug required' }, 400);
    // Slug lookup and tier resolution are independent — run them together. (This was a
    // 4-stage serial waterfall: find → getUser → subscription → a duplicate body fetch.)
    const [found, tier] = await Promise.all([
      findBySlug(body.slug),
      resolveTier(req.headers.get('Authorization')),
    ]);
    if (!found) return json({ error: 'not found' }, 404);

    const summary = toArticle(found.post, found.type);
    if (!canUnlock(found.type, summary.visibility, tier)) {
      return json({ article: { ...summary, locked: true, contentHtml: null } });
    }
    const contentHtml =
      found.type === 'recipe'
        ? await fetchRecipeBody(summary.slug)
        : // deno-lint-ignore no-explicit-any
          (((found.post as any)?.content?.rendered as string | undefined) ?? '');
    return json({ article: { ...summary, locked: false, contentHtml } });
  }

  return json({ error: 'unknown action' }, 400);
});
