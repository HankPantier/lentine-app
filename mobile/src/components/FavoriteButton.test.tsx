import { fireEvent, render, screen } from '@testing-library/react-native';
import { colors } from '@/theme/tokens';
import { FavoriteButton } from './FavoriteButton';

// Flatten a possibly-nested RN style prop into one object.
function flatStyle(node: { props: { style?: unknown } }): Record<string, unknown> {
  const s = node.props.style;
  return Array.isArray(s) ? Object.assign({}, ...(s as object[]).flat()) : (s as Record<string, unknown>);
}

describe('FavoriteButton', () => {
  it('offers "Save to favorites" with an outline heart when not favorited', async () => {
    await render(<FavoriteButton active={false} onPress={() => {}} />);
    const btn = screen.getByLabelText('Save to favorites');
    expect(btn).toBeTruthy();
    expect(screen.getByText('♡')).toBeTruthy();
  });

  it('offers "Remove from favorites" with a filled teal heart when favorited', async () => {
    await render(<FavoriteButton active onPress={() => {}} />);
    expect(screen.getByLabelText('Remove from favorites')).toBeTruthy();
    expect(flatStyle(screen.getByText('♥')).color).toBe(colors.blueLight);
  });

  it('fires onPress', async () => {
    const onPress = jest.fn();
    await render(<FavoriteButton active={false} onPress={onPress} />);
    await fireEvent.press(screen.getByLabelText('Save to favorites'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
