import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { colors } from '@/theme/tokens';
import { AppHeader, BackGlyph } from './AppHeader';

// Flatten a possibly-nested RN style prop into one object.
function flatStyle(node: { props: { style?: unknown } }): Record<string, unknown> {
  const s = node.props.style;
  return Array.isArray(s) ? Object.assign({}, ...(s as object[]).flat()) : (s as Record<string, unknown>);
}

describe('AppHeader', () => {
  it('renders a back button that fires onBack', async () => {
    const onBack = jest.fn();
    await render(<AppHeader onBack={onBack} />);
    await fireEvent.press(screen.getByLabelText('Go back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('constrains the back button to its own width (no full-row tap target)', async () => {
    await render(<AppHeader onBack={() => {}} />);
    expect(flatStyle(screen.getByLabelText('Go back')).alignSelf).toBe('flex-start');
  });

  it('renders the title and the right slot', async () => {
    await render(<AppHeader onBack={() => {}} title="Recipe" right={<Text>R</Text>} />);
    expect(screen.getByText('Recipe')).toBeTruthy();
    expect(screen.getByText('R')).toBeTruthy();
  });
});

describe('BackGlyph', () => {
  it('tints white on dark backgrounds and navy otherwise', async () => {
    await render(<BackGlyph onPress={() => {}} dark />);
    expect(flatStyle(screen.getByText('←')).color).toBe(colors.white);
    screen.unmount();
    await render(<BackGlyph onPress={() => {}} />);
    expect(flatStyle(screen.getByText('←')).color).toBe(colors.blue);
  });
});
