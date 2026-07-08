import type { Article } from './articles';
import { splitByDosha } from './feed-sections';

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

describe('splitByDosha', () => {
  it('puts everything in rest when the member has no dosha', () => {
    const list = [article({ id: 1, dosha: ['vata'] }), article({ id: 2 })];
    expect(splitByDosha(list, null)).toEqual({ matched: [], rest: list });
  });

  it('items without a dosha field go to rest (old cached payloads)', () => {
    const list = [article({ id: 1 }), article({ id: 2, dosha: [] })];
    expect(splitByDosha(list, 'vata')).toEqual({ matched: [], rest: list });
  });

  it('multi-dosha recipes match any listed dosha', () => {
    const both = article({ id: 1, dosha: ['pitta', 'vata'] });
    const other = article({ id: 2, dosha: ['kapha'] });
    expect(splitByDosha([both, other], 'vata')).toEqual({ matched: [both], rest: [other] });
  });

  it('partition preserves input order and loses no items', () => {
    const list = [
      article({ id: 1, dosha: ['kapha'] }),
      article({ id: 2, dosha: ['vata'] }),
      article({ id: 3, type: 'post', dosha: [] }),
      article({ id: 4, dosha: ['vata', 'kapha'] }),
    ];
    const { matched, rest } = splitByDosha(list, 'vata');
    expect(matched.map((a) => a.id)).toEqual([2, 4]);
    expect(rest.map((a) => a.id)).toEqual([1, 3]);
    expect(matched.length + rest.length).toBe(list.length);
  });
});
