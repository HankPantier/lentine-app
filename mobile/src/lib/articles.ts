import { supabase } from './supabase';

/** A WordPress article summary, as normalized by the wp-articles edge function. */
export interface Article {
  id: number;
  slug: string;
  /** Which WordPress post type this came from — drives gating and the in-app type filter. */
  type: 'post' | 'recipe';
  /** Per-item access flag from the WP `visibility` ACF field; `paid` items gate by tier. */
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

/**
 * Recent articles for the home list (public). Calls the wp-articles edge function, which
 * pulls + normalizes WordPress REST posts. Returns [] on any failure (console-warn only),
 * matching the null-returning style of lib/subscription.ts / lib/profile.ts.
 */
export async function fetchArticles(perPage = 10): Promise<Article[]> {
  const { data, error } = await supabase.functions.invoke('wp-articles', {
    body: { action: 'list', perPage },
  });
  if (error || !data?.articles) {
    console.warn('[articles] list failed:', error?.message ?? 'no data');
    return [];
  }
  return data.articles as Article[];
}

/**
 * Recipes matched to the member's dosha for the /today landing (public list). Calls the
 * wp-articles `today` action, which filters recipes by their ACF dosha tag. Returns [] on any
 * failure so /today degrades to its curated fallback content.
 */
export async function fetchToday(dosha: 'vata' | 'pitta' | 'kapha', perPage = 6): Promise<Article[]> {
  const { data, error } = await supabase.functions.invoke('wp-articles', {
    body: { action: 'today', dosha, perPage },
  });
  if (error || !data?.articles) {
    console.warn('[articles] today failed:', error?.message ?? 'no data');
    return [];
  }
  return data.articles as Article[];
}

/**
 * A single article by slug. supabase-js attaches the signed-in user's JWT to the invoke, so
 * the function can verify entitlement and return the full body to paid members. Returns null
 * on failure.
 */
export async function fetchArticle(slug: string): Promise<ArticleDetail | null> {
  const { data, error } = await supabase.functions.invoke('wp-articles', {
    body: { action: 'article', slug },
  });
  if (error || !data?.article) {
    console.warn('[articles] article failed:', error?.message ?? 'no data');
    return null;
  }
  return data.article as ArticleDetail;
}
