// wp-articles — the app's content seam to WordPress.
//
// Two actions over POST:
//   { action: 'list', perPage? }      → public: recent POSTS + RECIPES, merged, newest-first.
//                                        Each item carries `type` ('post'|'recipe') and
//                                        `visibility` ('free'|'paid') so the app draws lock badges.
//   { action: 'article', slug }       → tier-gated: the full body ONLY when the caller's Supabase
//                                        subscription TIER permits it (see canUnlock).
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

/** Strip tags + collapse whitespace for a plain-text card excerpt. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&hellip;/g, '…')
    .replace(/&#8217;/g, '’')
    .replace(/&#8230;/g, '…')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
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
    excerpt: stripHtml(post?.excerpt?.rendered ?? ''),
    image: (media?.source_url as string | undefined) ?? null,
    category: readCategory(post, type),
    date: post.date as string,
    link: post.link as string,
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

/** Fetch the most recent items of a post type, normalized; [] on any WP error. */
async function fetchType(type: ContentType, perPage: number) {
  const base = type === 'recipe' ? 'recipe' : 'posts';
  const res = await fetch(wpUrl(`${base}?_embed=1&per_page=${perPage}&orderby=date&order=desc`));
  if (!res.ok) return [];
  const items = await res.json();
  return Array.isArray(items) ? items.map((p) => toArticle(p, type)) : [];
}

/** Find a single item by slug across both post types; returns the raw WP object + its type. */
async function findBySlug(slug: string): Promise<{ post: unknown; type: ContentType } | null> {
  const [postRes, recipeRes] = await Promise.all([
    fetch(wpUrl(`posts?_embed=1&slug=${encodeURIComponent(slug)}`)),
    fetch(wpUrl(`recipe?_embed=1&slug=${encodeURIComponent(slug)}`)),
  ]);
  const postArr = postRes.ok ? await postRes.json() : [];
  if (Array.isArray(postArr) && postArr[0]) return { post: postArr[0], type: 'post' };
  const recipeArr = recipeRes.ok ? await recipeRes.json() : [];
  if (Array.isArray(recipeArr) && recipeArr[0]) return { post: recipeArr[0], type: 'recipe' };
  return null;
}

/** The full, assembled body HTML for an unlocked item, fetched with the WP credential. */
async function fetchBody(slug: string, type: ContentType): Promise<string> {
  if (type === 'recipe') {
    // Recipes have no `content` — the body is assembled by the auth-only la/v1 route.
    const res = await fetch(`${WP_BASE_URL}/wp-json/la/v1/recipe/${encodeURIComponent(slug)}`, {
      headers: basicAuthHeaders(),
    });
    if (!res.ok) return '';
    const data = await res.json();
    return (data?.recipe_body as string | undefined) ?? '';
  }
  // Posts: re-fetch authenticated so any server-side content filter returns the full body.
  const res = await fetch(wpUrl(`posts?slug=${encodeURIComponent(slug)}`), { headers: basicAuthHeaders() });
  if (!res.ok) return '';
  const posts = await res.json();
  const post = Array.isArray(posts) ? posts[0] : null;
  return (post?.content?.rendered as string | undefined) ?? '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  if (!WP_BASE_URL) return json({ error: 'WP_BASE_URL not configured' }, 500);

  let body: { action?: string; slug?: string; perPage?: number };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid JSON body' }, 400);
  }

  // --- list (public): merged posts + recipes, newest-first ---
  if (body.action === 'list') {
    const perPage = Math.min(Math.max(body.perPage ?? DEFAULT_PER_PAGE, 1), 30);
    const [posts, recipes] = await Promise.all([fetchType('post', perPage), fetchType('recipe', perPage)]);
    const articles = [...posts, ...recipes]
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .slice(0, perPage);
    return json({ articles });
  }

  // --- article (tier-gated) ---
  if (body.action === 'article') {
    if (!body.slug) return json({ error: 'slug required' }, 400);
    const found = await findBySlug(body.slug);
    if (!found) return json({ error: 'not found' }, 404);

    const summary = toArticle(found.post, found.type);
    const tier = await resolveTier(req.headers.get('Authorization'));
    if (!canUnlock(found.type, summary.visibility, tier)) {
      return json({ article: { ...summary, locked: true, contentHtml: null } });
    }
    const contentHtml = await fetchBody(summary.slug, found.type);
    return json({ article: { ...summary, locked: false, contentHtml } });
  }

  return json({ error: 'unknown action' }, 400);
});
