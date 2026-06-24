// wp-articles — the app's content seam to WordPress.
//
// Two actions over POST:
//   { action: 'list', perPage? }      → public: recent posts (title, image, excerpt, …)
//   { action: 'article', slug }       → gated: full body ONLY for a verified paid member
//
// Why this shape: the live WordPress site gates article bodies server-side (WooMemberships),
// so a full body needs an authenticated WP request. Auth is moving to Supabase, so we keep
// the WordPress credential here (server-side) and let SUPABASE decide who is entitled —
// verifying the caller's Supabase JWT + active subscription. When WP auth later moves to
// Supabase and content ungates, only the WP_* secrets go away; this interface stays.
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

/** Normalize a WP REST post (fetched with _embed) into the app's Article shape. */
// deno-lint-ignore no-explicit-any
function toArticle(post: any) {
  const media = post?._embedded?.['wp:featuredmedia']?.[0];
  const term = post?._embedded?.['wp:term']?.flat?.().find?.((t: any) => t?.taxonomy === 'category');
  return {
    id: post.id as number,
    slug: post.slug as string,
    title: stripHtml(post?.title?.rendered ?? ''),
    excerpt: stripHtml(post?.excerpt?.rendered ?? ''),
    image: (media?.source_url as string | undefined) ?? null,
    category: (term?.name as string | undefined) ?? null,
    date: post.date as string,
    link: post.link as string,
  };
}

async function wpFetch(path: string, auth: boolean): Promise<Response> {
  const headers: Record<string, string> = {};
  if (auth && WP_USER && WP_APP_PASSWORD) {
    headers.Authorization = `Basic ${btoa(`${WP_USER}:${WP_APP_PASSWORD}`)}`;
  }
  return fetch(`${WP_BASE_URL}/wp-json/wp/v2/${path}`, { headers });
}

/** Verify the caller's JWT and return whether they hold an entitling subscription. */
async function isPaidMember(authHeader: string | null): Promise<boolean> {
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token || !SUPABASE_URL || !SERVICE_ROLE_KEY) return false;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) return false;
  const { data: sub } = await admin
    .from('subscriptions')
    .select('status')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  return !!sub && ENTITLING_STATUSES.includes(sub.status);
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

  // --- list (public) ---
  if (body.action === 'list') {
    const perPage = Math.min(Math.max(body.perPage ?? DEFAULT_PER_PAGE, 1), 30);
    const res = await wpFetch(`posts?_embed=1&per_page=${perPage}&orderby=date&order=desc`, false);
    if (!res.ok) return json({ error: `WordPress responded ${res.status}` }, 502);
    const posts = await res.json();
    return json({ articles: Array.isArray(posts) ? posts.map(toArticle) : [] });
  }

  // --- article (gated) ---
  if (body.action === 'article') {
    if (!body.slug) return json({ error: 'slug required' }, 400);
    const res = await wpFetch(`posts?_embed=1&slug=${encodeURIComponent(body.slug)}`, true);
    if (!res.ok) return json({ error: `WordPress responded ${res.status}` }, 502);
    const posts = await res.json();
    const post = Array.isArray(posts) ? posts[0] : null;
    if (!post) return json({ error: 'not found' }, 404);

    const summary = toArticle(post);
    const paid = await isPaidMember(req.headers.get('Authorization'));
    if (!paid) return json({ article: { ...summary, locked: true, contentHtml: null } });

    return json({ article: { ...summary, locked: false, contentHtml: post?.content?.rendered ?? '' } });
  }

  return json({ error: 'unknown action' }, 400);
});
