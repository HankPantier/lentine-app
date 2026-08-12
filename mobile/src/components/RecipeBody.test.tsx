import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
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

  it('has no check-off UI or Reset when no toggle handler is passed', async () => {
    await render(<RecipeBody structured={sample} contentWidth={360} />);
    expect(screen.queryByText('Reset')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
    const item = screen.getByText('rolled oats');
    expect(StyleSheet.flatten(item.props.style).textDecorationLine).not.toBe('line-through');
  });

  it('strikes through checked ingredients and toggles on press', async () => {
    const onToggle = jest.fn();
    await render(
      <RecipeBody
        structured={sample}
        contentWidth={360}
        checkedKeys={['0:0']}
        onToggleIngredient={onToggle}
        onResetChecked={jest.fn()}
      />,
    );
    const item = screen.getByText('rolled oats');
    expect(StyleSheet.flatten(item.props.style).textDecorationLine).toBe('line-through');
    fireEvent.press(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledWith('0:0');
  });

  it('shows Reset only when something is checked, and fires the reset handler', async () => {
    const onReset = jest.fn();
    const { rerender } = await render(
      <RecipeBody
        structured={sample}
        contentWidth={360}
        checkedKeys={[]}
        onToggleIngredient={jest.fn()}
        onResetChecked={onReset}
      />,
    );
    expect(screen.queryByText('Reset')).toBeNull();
    await rerender(
      <RecipeBody
        structured={sample}
        contentWidth={360}
        checkedKeys={['0:0']}
        onToggleIngredient={jest.fn()}
        onResetChecked={onReset}
      />,
    );
    fireEvent.press(screen.getByText('Reset'));
    expect(onReset).toHaveBeenCalled();
  });

  it('shows a Cook Mode button only when a handler is passed', async () => {
    const onStart = jest.fn();
    const { rerender } = await render(<RecipeBody structured={sample} contentWidth={360} />);
    expect(screen.queryByText('Cook Mode')).toBeNull();
    await rerender(
      <RecipeBody structured={sample} contentWidth={360} onStartCookMode={onStart} />,
    );
    fireEvent.press(screen.getByText('Cook Mode'));
    expect(onStart).toHaveBeenCalled();
  });
});
