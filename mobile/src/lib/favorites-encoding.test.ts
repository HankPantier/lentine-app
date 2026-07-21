import type { Article } from './articles';
import {
  asFavorites,
  isFavorited,
  mergeFavorites,
  toFavoriteEntry,
  toggleFavorite,
  type FavoriteEntry,
} from './favorites-encoding';

const article = (over: Partial<Article> = {}): Article => ({
  id: 101,
  slug: 'golden-milk',
  type: 'recipe',
  visibility: 'free',
  title: 'Golden Milk',
  excerpt: 'A warming drink.',
  image: 'https://example.com/golden.jpg',
  category: 'Drinks',
  date: '2026-07-01',
  link: 'https://example.com/golden-milk',
  dosha: ['vata'],
  season: ['winter'],
  ...over,
});

const entry = (over: Partial<FavoriteEntry> = {}): FavoriteEntry => ({
  slug: 'golden-milk',
  id: 101,
  title: 'Golden Milk',
  excerpt: 'A warming drink.',
  image: 'https://example.com/golden.jpg',
  category: 'Drinks',
  type: 'recipe',
  visibility: 'free',
  date: '2026-07-01',
  link: 'https://example.com/golden-milk',
  dosha: ['vata'],
  season: ['winter'],
  savedAt: '2026-07-20T10:00:00.000Z',
  ...over,
});

// A FavoriteEntry must remain a renderable Article summary (ArticleCard, setArticlePreview).
const asArticle: Article = entry();
void asArticle;

describe('toFavoriteEntry', () => {
  it('snapshots the card fields from an article, stamping savedAt', () => {
    expect(toFavoriteEntry(article(), '2026-07-20T10:00:00.000Z')).toEqual(entry());
  });

  it('snapshots visibility so the favorites list can show the Members badge', () => {
    expect(toFavoriteEntry(article({ visibility: 'paid' }), '2026-07-20T10:00:00.000Z').visibility).toBe('paid');
  });

  it('carries missing dosha/season through as empty arrays', () => {
    const e = toFavoriteEntry(article({ dosha: undefined, season: undefined }), '2026-07-20T10:00:00.000Z');
    expect(e.dosha).toEqual([]);
    expect(e.season).toEqual([]);
  });
});

describe('asFavorites', () => {
  it('round-trips a favorites list through jsonb (stringify → parse → asFavorites)', () => {
    const list = [entry(), entry({ slug: 'kitchari', id: 102, title: 'Kitchari' })];
    expect(asFavorites(JSON.parse(JSON.stringify(list)))).toEqual(list);
  });

  it('drops entries missing a slug, id, title, or savedAt', () => {
    const bad = [
      entry(),
      { ...entry(), slug: undefined },
      { ...entry(), id: 'nope' },
      { ...entry(), title: 42 },
      { ...entry(), savedAt: null },
      'garbage',
      null,
    ];
    expect(asFavorites(bad)).toEqual([entry()]);
  });

  it('defaults optional display fields on sparse entries', () => {
    const sparse = { slug: 'kitchari', id: 102, title: 'Kitchari', savedAt: '2026-07-20T10:00:00.000Z' };
    expect(asFavorites([sparse])).toEqual([
      entry({
        slug: 'kitchari',
        id: 102,
        title: 'Kitchari',
        excerpt: '',
        image: null,
        category: null,
        type: 'recipe',
        visibility: 'free',
        date: '',
        link: '',
        dosha: [],
        season: [],
      }),
    ]);
  });

  it('returns [] for non-array input', () => {
    expect(asFavorites(null)).toEqual([]);
    expect(asFavorites(undefined)).toEqual([]);
    expect(asFavorites({ 0: entry() })).toEqual([]);
    expect(asFavorites('x')).toEqual([]);
  });
});

describe('isFavorited', () => {
  it('matches by slug', () => {
    const list = [entry()];
    expect(isFavorited(list, 'golden-milk')).toBe(true);
    expect(isFavorited(list, 'kitchari')).toBe(false);
    expect(isFavorited([], 'golden-milk')).toBe(false);
  });
});

describe('toggleFavorite', () => {
  it('prepends a new favorite (newest first)', () => {
    const kitchari = entry({ slug: 'kitchari', id: 102, title: 'Kitchari' });
    expect(toggleFavorite([entry()], kitchari)).toEqual([kitchari, entry()]);
  });

  it('removes an existing favorite by slug', () => {
    const kitchari = entry({ slug: 'kitchari', id: 102 });
    expect(toggleFavorite([kitchari, entry()], entry())).toEqual([kitchari]);
  });

  it('does not mutate the input list', () => {
    const list = [entry()];
    toggleFavorite(list, entry({ slug: 'kitchari', id: 102 }));
    toggleFavorite(list, entry());
    expect(list).toEqual([entry()]);
  });
});

describe('mergeFavorites', () => {
  it('unions server and local, newest savedAt first', () => {
    const server = [entry({ slug: 'a', id: 1, savedAt: '2026-07-01T00:00:00.000Z' })];
    const local = [entry({ slug: 'b', id: 2, savedAt: '2026-07-02T00:00:00.000Z' })];
    expect(mergeFavorites(server, local)).toEqual([
      entry({ slug: 'b', id: 2, savedAt: '2026-07-02T00:00:00.000Z' }),
      entry({ slug: 'a', id: 1, savedAt: '2026-07-01T00:00:00.000Z' }),
    ]);
  });

  it('dedupes by slug, keeping the earliest savedAt (original save wins)', () => {
    const server = [entry({ savedAt: '2026-07-01T00:00:00.000Z' })];
    const local = [entry({ savedAt: '2026-07-05T00:00:00.000Z' })];
    const merged = mergeFavorites(server, local);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.savedAt).toBe('2026-07-01T00:00:00.000Z');
  });

  it('handles either side being empty', () => {
    expect(mergeFavorites([], [entry()])).toEqual([entry()]);
    expect(mergeFavorites([entry()], [])).toEqual([entry()]);
    expect(mergeFavorites([], [])).toEqual([]);
  });
});
