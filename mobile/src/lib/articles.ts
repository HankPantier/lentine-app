import { cached } from './content-cache';
import { supabase } from './supabase';

/** A WordPress article summary, as normalized by the wp-articles edge function. */
export interface Article {
  id: number;
  slug: string;
  /** Which WordPress post type this came from — drives gating and the in-app type filter. */
  type: 'post' | 'recipe';
  /** Per-item access flag from WordPress; `paid` items gate by tier. */
  visibility: 'free' | 'paid';
  title: string;
  excerpt: string;
  image: string | null;
  category: string | null;
  date: string;
  link: string;
}

/** A single article. `contentHtml` is present only for verified paid members. */
export interface ArticleDetail extends Article {
  locked: boolean;
  contentHtml: string | null;
}

/** How long content responses stay fresh. A content feed tolerates minutes of staleness. */
const TTL_MS = 5 * 60 * 1000;

/** Persisted copy of the home feed (summaries only — never paid bodies). */
const FEED_PERSIST_KEY = 'la_feed_cache_v1';

/** A hung request must surface as an error the UI can retry — never an eternal spinner. */
const REQUEST_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms = REQUEST_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('request timed out')), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/** Invoke the wp-articles edge function; throws on transport errors, timeouts, or empty data. */
async function invokeArticles<T>(body: Record<string, unknown>, pick: (data: any) => T | undefined): Promise<T> {
  const { data, error } = await withTimeout(supabase.functions.invoke('wp-articles', { body }));
  const value = error ? undefined : pick(data);
  if (value === undefined) throw new Error(error?.message ?? 'no data');
  return value;
}

/**
 * Recent articles for the home list (public). Cached for a few minutes and persisted so a cold
 * start paints instantly. Throws on failure so the feed can show a retry state — an API error
 * must not masquerade as an empty feed.
 */
export function fetchArticles(perPage = 10): Promise<Article[]> {
  return cached(
    `list:${perPage}`,
    TTL_MS,
    () => invokeArticles({ action: 'list', perPage }, (d) => d?.articles as Article[] | undefined),
    { persistKey: FEED_PERSIST_KEY },
  );
}

/**
 * Recipes matched to the member's dosha for the /today landing (public list). Cached in memory
 * only. Throws on failure — /today distinguishes "could not load" from "none published yet".
 */
export function fetchToday(dosha: 'vata' | 'pitta' | 'kapha', perPage = 6): Promise<Article[]> {
  return cached(`today:${dosha}:${perPage}`, TTL_MS, () =>
    invokeArticles({ action: 'today', dosha, perPage }, (d) => d?.articles as Article[] | undefined),
  );
}

/**
 * A single article by slug. supabase-js attaches the signed-in user's JWT to the invoke, so
 * the function can verify entitlement and return the full body to paid members. Cached in
 * memory only (bodies never touch disk). Returns null on failure.
 */
export async function fetchArticle(slug: string): Promise<ArticleDetail | null> {
  try {
    return await cached(`article:${slug}`, TTL_MS, () =>
      invokeArticles({ action: 'article', slug }, (d) => d?.article as ArticleDetail | undefined),
    );
  } catch (err) {
    console.warn('[articles] article failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
