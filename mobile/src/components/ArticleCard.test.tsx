import { render, screen } from '@testing-library/react-native';
import type { Article } from '@/lib/articles';
import { ArticleCard } from './ArticleCard';

const ARTICLE: Article = {
  id: 1,
  slug: 'golden-kitchari',
  type: 'recipe',
  visibility: 'paid',
  title: 'Golden Kitchari',
  excerpt: 'A warming, grounding bowl for any season.',
  image: null,
  category: 'NOURISH',
  date: '2026-06-20T10:00:00',
  link: 'https://example.com',
};

// Flatten a possibly-nested RN style prop into one object (same helper as AppHeader.test).
function flatStyle(node: { props: { style?: unknown } }): Record<string, unknown> {
  const s = node.props.style;
  return Array.isArray(s) ? Object.assign({}, ...(s as object[]).flat()) : (s as Record<string, unknown>);
}

describe('ArticleCard flag', () => {
  it('renders the flag label in the given color', async () => {
    await render(
      <ArticleCard article={ARTICLE} onPress={() => {}} flag={{ label: 'For you', color: '#3FBECC' }} />,
    );
    const tag = screen.getByText('For you');
    expect(flatStyle(tag).color).toBe('#3FBECC');
  });
});

describe('ArticleCard compact variant', () => {
  it('renders title and meta and keeps the Members lock badge', async () => {
    await render(<ArticleCard article={ARTICLE} onPress={() => {}} locked variant="compact" />);
    expect(screen.getByText('Golden Kitchari')).toBeTruthy();
    expect(screen.getByText('Recipe · NOURISH')).toBeTruthy();
    expect(screen.getByText('Members')).toBeTruthy();
  });

  it('omits the excerpt', async () => {
    await render(<ArticleCard article={ARTICLE} onPress={() => {}} variant="compact" />);
    expect(screen.queryByText(ARTICLE.excerpt)).toBeNull();
  });

  it('keeps the ", members only" accessibility label when locked', async () => {
    await render(<ArticleCard article={ARTICLE} onPress={() => {}} locked variant="compact" />);
    expect(screen.getByLabelText('Golden Kitchari, members only')).toBeTruthy();
  });
});
