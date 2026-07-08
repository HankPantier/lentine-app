import type { Article } from './articles';
import { applyFeedFilter, feedCategories, type FeedFilter } from './feed-filters';

function article(over: Partial<Article> & { id: number }): Article {
  return {
    slug: `a-${over.id}`,
    type: 'recipe',
    visibility: 'paid',
    title: `Article ${over.id}`,
    excerpt: '',
    image: null,
    category: null,
    date: '2026-07-01T00:00:00',
    link: 'https://example.com',
    ...over,
  };
}

const LIST: Article[] = [
  article({ id: 1, type: 'post', category: 'Love Notes' }),
  article({ id: 2, type: 'recipe', category: 'Salads', dosha: ['vata', 'pitta'] }),
  article({ id: 3, type: 'recipe', category: 'Nourish', dosha: ['kapha'] }),
  article({ id: 4, type: 'post', category: 'Love Notes' }),
  article({ id: 5, type: 'recipe', category: null }),
];

describe('applyFeedFilter', () => {
  it('all passes everything through in order', () => {
    expect(applyFeedFilter(LIST, { kind: 'all' })).toEqual(LIST);
  });

  it('filters by content type', () => {
    const posts = applyFeedFilter(LIST, { kind: 'type', value: 'post' });
    expect(posts.map((a) => a.id)).toEqual([1, 4]);
    const recipes = applyFeedFilter(LIST, { kind: 'type', value: 'recipe' });
    expect(recipes.map((a) => a.id)).toEqual([2, 3, 5]);
  });

  it('filters by dosha tag; untagged items never match', () => {
    const vata = applyFeedFilter(LIST, { kind: 'dosha', value: 'vata' });
    expect(vata.map((a) => a.id)).toEqual([2]);
    const kapha = applyFeedFilter(LIST, { kind: 'dosha', value: 'kapha' });
    expect(kapha.map((a) => a.id)).toEqual([3]);
  });

  it('filters by category', () => {
    const notes = applyFeedFilter(LIST, { kind: 'category', value: 'Love Notes' });
    expect(notes.map((a) => a.id)).toEqual([1, 4]);
  });

  it('an unknown category yields an empty list, not a crash', () => {
    expect(applyFeedFilter(LIST, { kind: 'category', value: 'Nope' })).toEqual([]);
  });
});

describe('feedCategories', () => {
  it('returns the unique categories, alphabetical, skipping nulls', () => {
    expect(feedCategories(LIST)).toEqual(['Love Notes', 'Nourish', 'Salads']);
  });

  it('empty feed yields no categories', () => {
    expect(feedCategories([])).toEqual([]);
  });
});

// Type-level sanity: the filter union covers what the chips can express.
const _examples: FeedFilter[] = [
  { kind: 'all' },
  { kind: 'type', value: 'post' },
  { kind: 'dosha', value: 'pitta' },
  { kind: 'category', value: 'Salads' },
];
void _examples;
