import { render, screen } from '@testing-library/react-native';
import type { RecipeStructured } from '@/lib/articles';
import { RecipeBody } from './RecipeBody';

const sample: RecipeStructured = {
  intro: '<p>An intro.</p>',
  notes: '<p>Swap the almonds for walnuts.</p>',
  flavor: {
    notes: '<p>Warming and grounding.</p>',
    tastes: [
      { label: 'Sweet', value: 'maple, oat' },
      { label: 'Salty', value: 'N/A' },
    ],
  },
  ingredient_sections: [
    { headline: 'For the cake', items: [{ amount: '2 cups', item: 'rolled oats' }] },
  ],
  instructions: [{ headline: 'Prep', content: '<p>Heat the oven.</p>' }],
};

describe('RecipeBody', () => {
  it('renders the native section structure from structured data', async () => {
    await render(<RecipeBody structured={sample} contentWidth={360} />);
    // Section eyebrow headers
    expect(screen.getByText('Recipe Notes')).toBeTruthy();
    expect(screen.getByText('Flavor Notes')).toBeTruthy();
    expect(screen.getByText('Ingredients')).toBeTruthy();
    expect(screen.getByText('Instructions')).toBeTruthy();
    // Flavor grid label + ingredient amount/item + section heading
    expect(screen.getByText('Sweet')).toBeTruthy();
    expect(screen.getByText('For the cake')).toBeTruthy();
    expect(screen.getByText('2 cups')).toBeTruthy();
    expect(screen.getByText('rolled oats')).toBeTruthy();
    // Step badge number + headline
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('Prep')).toBeTruthy();
  });

  it('omits sections with no data (empty flavor + notes)', async () => {
    const minimal: RecipeStructured = {
      intro: '',
      notes: '',
      flavor: { notes: '', tastes: [] },
      ingredient_sections: [{ headline: '', items: [{ amount: '1', item: 'egg' }] }],
      instructions: [],
    };
    await render(<RecipeBody structured={minimal} contentWidth={360} />);
    expect(screen.queryByText('Recipe Notes')).toBeNull();
    expect(screen.queryByText('Flavor Notes')).toBeNull();
    expect(screen.queryByText('Instructions')).toBeNull();
    expect(screen.getByText('Ingredients')).toBeTruthy();
    expect(screen.getByText('egg')).toBeTruthy();
  });
});
