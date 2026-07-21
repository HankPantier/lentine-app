import type { Article } from './articles';

// Pure encode/decode + list helpers for the favorites column on profiles. Kept free of any
// I/O so the storage contract (what we read back out of jsonb) is unit-testable without a
// Supabase client — same discipline as dosha-encoding.

/**
 * A saved recipe: the full Article summary snapshotted at heart-tap time, plus savedAt. The
 * complete summary lets the /favorites screen render a card instantly (and offline) AND seed
 * the reader's instant-paint preview — no re-fetching every slug from WordPress.
 */
export interface FavoriteEntry extends Article {
  dosha: string[];
  season: string[];
  /** ISO timestamp of the original save — drives newest-first ordering. */
  savedAt: string;
}

/** Snapshot an article's summary at the moment it is favorited. */
export function toFavoriteEntry(article: Article, savedAt: string): FavoriteEntry {
  return {
    slug: article.slug,
    id: article.id,
    title: article.title,
    excerpt: article.excerpt,
    image: article.image ?? null,
    category: article.category ?? null,
    type: article.type,
    visibility: article.visibility,
    date: article.date,
    link: article.link,
    dosha: article.dosha ?? [],
    season: article.season ?? [],
    savedAt,
  };
}

/**
 * Coerce a jsonb blob into a favorites list. Entries missing the identity fields
 * (slug/id/title/savedAt) are dropped; optional display fields get safe defaults.
 * Returns [] for non-array input.
 */
export function asFavorites(v: unknown): FavoriteEntry[] {
  if (!Array.isArray(v)) return [];
  const out: FavoriteEntry[] = [];
  for (const item of v) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    if (
      typeof o.slug !== 'string' ||
      typeof o.id !== 'number' ||
      typeof o.title !== 'string' ||
      typeof o.savedAt !== 'string'
    ) {
      continue;
    }
    out.push({
      slug: o.slug,
      id: o.id,
      title: o.title,
      excerpt: typeof o.excerpt === 'string' ? o.excerpt : '',
      image: typeof o.image === 'string' ? o.image : null,
      category: typeof o.category === 'string' ? o.category : null,
      type: o.type === 'post' ? 'post' : 'recipe',
      visibility: o.visibility === 'paid' ? 'paid' : 'free',
      date: typeof o.date === 'string' ? o.date : '',
      link: typeof o.link === 'string' ? o.link : '',
      dosha: Array.isArray(o.dosha) ? o.dosha.filter((d): d is string => typeof d === 'string') : [],
      season: Array.isArray(o.season) ? o.season.filter((s): s is string => typeof s === 'string') : [],
      savedAt: o.savedAt,
    });
  }
  return out;
}

export function isFavorited(list: FavoriteEntry[], slug: string): boolean {
  return list.some((f) => f.slug === slug);
}

/** Add (prepend — newest first) or remove by slug. Never mutates the input list. */
export function toggleFavorite(list: FavoriteEntry[], entry: FavoriteEntry): FavoriteEntry[] {
  return isFavorited(list, entry.slug)
    ? list.filter((f) => f.slug !== entry.slug)
    : [entry, ...list];
}

/**
 * Union server + local favorites for the sign-in sync. Dedupes by slug keeping the earliest
 * savedAt (the original save wins), sorted newest first. A sign-in must never drop a heart
 * saved on either side.
 */
export function mergeFavorites(server: FavoriteEntry[], local: FavoriteEntry[]): FavoriteEntry[] {
  const bySlug = new Map<string, FavoriteEntry>();
  for (const f of [...server, ...local]) {
    const existing = bySlug.get(f.slug);
    if (!existing || f.savedAt < existing.savedAt) bySlug.set(f.slug, f);
  }
  return [...bySlug.values()].sort((a, b) => (a.savedAt < b.savedAt ? 1 : a.savedAt > b.savedAt ? -1 : 0));
}
