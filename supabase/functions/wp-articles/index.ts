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

/**
 * Warm-isolate cache of a slug's WP DATA (summary + full body) — deliberately NOT the
 * response: entitlement varies per caller, so `gateArticle` applies the tier gate on every
 * request. Same 60s TTL as the list cache. This matters because the article origin fetches
 * are authenticated (WP Engine's page cache doesn't apply) and can take 10s+ each.
 */
interface ArticleSource {
  summary: ReturnType<typeof toArticle>;
  type: ContentType;
  contentHtml: string;
}
const articleSourceCache = new Map<string, { at: number; src: ArticleSource }>();

function articleSource(slug: string): ArticleSource | null {
  const hit = articleSourceCache.get(slug);
  if (!hit || Date.now() - hit.at >= RESPONSE_CACHE_TTL_MS) return null;
  return hit.src;
}

/** Apply the caller's entitlement to cached WP data — the body only leaves for entitled tiers. */
function gateArticle(src: ArticleSource, tier: Tier | null) {
  const locked = !canUnlock(src.type, src.summary.visibility, tier);
  return { ...src.summary, locked, contentHtml: locked ? null : src.contentHtml };
}

/**
 * Cross-isolate copy of the article-source cache (table `wp_content_cache`, service-role
 * only — payloads hold paid bodies). The in-isolate Map above only helps when a request
 * lands on a warm isolate; this one makes the first fetch pay for everyone. Entries are
 * served for up to SHARED_CACHE_MAX_AGE_MS, and refreshed in the background once older
 * than SHARED_CACHE_FRESH_MS (stale-while-revalidate — nobody waits on WordPress twice).
 */
const SHARED_CACHE_FRESH_MS = 10 * 60_000;
const SHARED_CACHE_MAX_AGE_MS = 24 * 60 * 60_000;

function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

async function sharedCacheGet(key: string): Promise<{ src: ArticleSource; fresh: boolean } | null> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  try {
    const { data } = await adminClient()
      .from('wp_content_cache')
      .select('payload, fetched_at')
      .eq('key', key)
      .maybeSingle();
    if (!data) return null;
    const age = Date.now() - new Date(data.fetched_at as string).getTime();
    if (age >= SHARED_CACHE_MAX_AGE_MS) return null;
    return { src: data.payload as ArticleSource, fresh: age < SHARED_CACHE_FRESH_MS };
  } catch {
    return null; // cache trouble must never break the request path
  }
}

async function sharedCachePut(key: string, src: ArticleSource): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return;
  try {
    await adminClient()
      .from('wp_content_cache')
      .upsert({ key, payload: src, fetched_at: new Date().toISOString() });
  } catch {
    // best effort
  }
}

/** Run work after the response is sent (Supabase edge runtime); falls back to fire-and-forget. */
function inBackground(work: Promise<unknown>) {
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime;
  const silenced = work.catch(() => {});
  if (rt?.waitUntil) rt.waitUntil(silenced);
}

/** Re-fetch a slug's full source from WordPress and refresh both caches. */
async function revalidateArticle(slug: string): Promise<void> {
  const [found, body] = await Promise.all([
    findBySlug(slug),
    fetchRecipeBody(slug).catch(() => ''), // cheap for posts (404), transient-cached for recipes
  ]);
  if (!found) return;
  const summary = toArticle(found.post, found.type);
  const contentHtml =
    found.type === 'recipe'
      ? body
      : // deno-lint-ignore no-explicit-any
        (((found.post as any)?.content?.rendered as string | undefined) ?? '');
  if (found.type === 'recipe' && !contentHtml) return; // never pin an empty body
  const src: ArticleSource = { summary, type: found.type, contentHtml };
  articleSourceCache.set(slug, { at: Date.now(), src });
  await sharedCachePut(`article:${slug}`, src);
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
    const authHeader = req.headers.get('Authorization');

    // The WP data for a slug is entitlement-INDEPENDENT (the gate below is applied per
    // request), so caching it is safe — and vital: the origin fetches are authenticated,
    // which bypasses WP Engine's page cache. Fast path 1: this isolate already has it.
    const cachedSrc = articleSource(body.slug);
    if (cachedSrc) {
      const tier = await resolveTier(authHeader);
      return json({ article: gateArticle(cachedSrc, tier) });
    }

    // Fast path 2: the cross-isolate shared cache (~100ms) — checked alongside tier
    // resolution. Stale entries are still served instantly; WordPress is consulted in the
    // background so the NEXT reader gets the refreshed copy (stale-while-revalidate).
    const [shared, tier] = await Promise.all([
      sharedCacheGet(`article:${body.slug}`),
      resolveTier(authHeader),
    ]);
    if (shared) {
      articleSourceCache.set(body.slug, { at: Date.now(), src: shared.src });
      if (!shared.fresh) inBackground(revalidateArticle(body.slug));
      return json({ article: gateArticle(shared.src, tier) });
    }

    // True miss: everything the response could need runs CONCURRENTLY. The recipe body is
    // fetched speculatively when the caller sent credentials (anonymous callers can never
    // unlock, so they skip the extra origin hit); if the slug turns out to be a post or the
    // caller isn't entitled, the result is simply not used this request — but it still
    // warms the cache for the next one.
    const speculativeBody = authHeader ? fetchRecipeBody(body.slug).catch(() => '') : null;
    const found = await findBySlug(body.slug);
    if (!found) return json({ error: 'not found' }, 404);

    const summary = toArticle(found.post, found.type);
    const unlocked = canUnlock(found.type, summary.visibility, tier);
    let contentHtml = '';
    if (found.type === 'recipe') {
      // The body is awaited only for entitled callers — a locked response never waits on
      // (or triggers) the extra origin hit.
      if (unlocked) contentHtml = await (speculativeBody ?? fetchRecipeBody(body.slug).catch(() => ''));
    } else {
      // deno-lint-ignore no-explicit-any
      contentHtml = ((found.post as any)?.content?.rendered as string | undefined) ?? '';
    }
    const src: ArticleSource = { summary, type: found.type, contentHtml };
    // Cache only complete sources: a recipe without its body (locked caller, failed fetch)
    // must hit the origin next request instead of pinning an empty body for the TTL.
    if (found.type !== 'recipe' || contentHtml) {
      articleSourceCache.set(body.slug, { at: Date.now(), src });
      inBackground(sharedCachePut(`article:${body.slug}`, src));
    } else {
      // Anonymous first opener of a recipe: no body was fetched for the response — build the
      // complete source in the background so the cache still gets warmed for everyone.
      inBackground(revalidateArticle(body.slug));
    }
    return json({ article: gateArticle(src, tier) });
  }

  return json({ error: 'unknown action' }, 400);
});
