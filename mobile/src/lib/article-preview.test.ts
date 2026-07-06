import { getArticlePreview, setArticlePreview } from './article-preview';
import type { Article } from './articles';

const article: Article = {
  id: 1,
  slug: 'golden-kitchari',
  type: 'recipe',
  visibility: 'paid',
  title: 'Golden Kitchari',
  excerpt: 'A warming, grounding bowl.',
  image: null,
  category: 'NOURISH',
  date: '2026-06-20T10:00:00',
  link: 'https://lentinealexis.com/recipe/golden-kitchari',
};

describe('article preview store', () => {
  it('round-trips a tapped article by slug', () => {
    setArticlePreview(article);
    expect(getArticlePreview('golden-kitchari')).toEqual(article);
  });

  it('misses for slugs never tapped (cold deep link)', () => {
    expect(getArticlePreview('never-seen')).toBeUndefined();
  });

  it('latest write wins for the same slug', () => {
    setArticlePreview(article);
    setArticlePreview({ ...article, title: 'Updated' });
    expect(getArticlePreview('golden-kitchari')?.title).toBe('Updated');
  });
});
