// Shared WordPress → app normalization, used by BOTH the wp-articles edge function (live
// list/search/article) and the sync-content function (which mirrors the catalog into the
// content_index table). Keeping the single toArticle() here prevents the two from drifting.
//
// Pure functions only — no network, no Supabase, no entitlement. The gating helpers
// (canUnlock/resolveTier/gateArticle) deliberately stay in wp-articles: only the summary
// shape is shared.

export type ContentType = 'post' | 'recipe';

/** A WordPress article summary, mirrored to the app's Article interface. */
export interface Article {
  id: number;
  slug: string;
  type: ContentType;
  visibility: 'free' | 'paid';
  title: string;
  excerpt: string;
  image: string | null;
  category: string | null;
  date: string;
  link: string;
  dosha: string[];
  season: string[];
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
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&([a-z]+);/gi, (m: string, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A card-ready excerpt. WooCommerce Memberships appends its purchase pitch ("To access this
 * content, you must purchase …") to every restricted excerpt — pure noise on a card (the lock
 * badge already communicates gating) and it shows even to entitled members. Cut it.
 */
export function cardExcerpt(html: string): string {
  return stripHtml(html)
    .replace(/\s*To access this (content|post|recipe)\b.*$/i, '')
    .trim();
}

/** Normalize the per-item `visibility` REST field to the app's two values; default `paid` (fail safe). */
export function readVisibility(post: { visibility?: unknown }): 'free' | 'paid' {
  return post?.visibility === 'free' ? 'free' : 'paid';
}

/**
 * The category label for a card. Posts carry it via the embedded `category` taxonomy term;
 * recipes have no taxonomy — their category is the ACF `category` field exposed by the mu-plugin.
 */
// deno-lint-ignore no-explicit-any
export function readCategory(post: any, type: ContentType): string | null {
  if (type === 'recipe') {
    const c = post?.category;
    if (Array.isArray(c)) return (c[0] as string | undefined) ?? null;
    return typeof c === 'string' && c ? c : null;
  }
  const term = post?._embedded?.['wp:term']?.flat?.().find?.((t: any) => t?.taxonomy === 'category');
  return (term?.name as string | undefined) ?? null;
}

/** A bounded image for a ~180-200pt card/hero — the originals are multi-MB "-scaled" uploads. */
// deno-lint-ignore no-explicit-any
export function bestImage(media: any): string | null {
  const sizes = media?.media_details?.sizes;
  return (
    (sizes?.medium_large?.source_url as string | undefined) ??
    (sizes?.large?.source_url as string | undefined) ??
    (media?.source_url as string | undefined) ??
    null
  );
}

/** The recipe's dosha labels, lowercased (ACF `dosha` array field, e.g. ["Vata","Pitta"]). */
// deno-lint-ignore no-explicit-any
export function readDoshas(post: any): string[] {
  const d = post?.dosha;
  return Array.isArray(d) ? d.map((x: unknown) => String(x).toLowerCase()) : [];
}

/** The recipe's season labels, lowercased (ACF `season` array field, e.g. ["Spring","Fall"]). */
// deno-lint-ignore no-explicit-any
export function readSeasons(post: any): string[] {
  const s = post?.season;
  return Array.isArray(s) ? s.map((x: unknown) => String(x).toLowerCase()) : [];
}

/** Normalize a WP REST post/recipe (fetched with _embed) into the app's Article shape. */
// deno-lint-ignore no-explicit-any
export function toArticle(post: any, type: ContentType): Article {
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
    dosha: readDoshas(post),
    season: readSeasons(post),
  };
}
