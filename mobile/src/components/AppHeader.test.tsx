import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { colors } from '@/theme/tokens';
import { AppHeader, BackGlyph } from './AppHeader';

// The header's default avatar navigates and reads the member's name/dosha — mock both hooks
// so the component stays renderable without providers.
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/onboarding/state', () => ({
  useOnboarding: () => ({
    state: { firstName: 'Maya', dosha: 'pitta' },
    hydrated: true,
    update: jest.fn(),
    setAnswer: jest.fn(),
    reset: jest.fn(),
  }),
}));

// Flatten a possibly-nested RN style prop into one object.
function flatStyle(node: { props: { style?: unknown } }): Record<string, unknown> {
  const s = node.props.style;
  return Array.isArray(s) ? Object.assign({}, ...(s as object[]).flat()) : (s as Record<string, unknown>);
}

beforeEach(() => mockPush.mockClear());

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

  it('carries the brand behind a back button (wordmark centered)', async () => {
    await render(<AppHeader onBack={() => {}} />);
    expect(screen.getByLabelText('Lentine Alexis')).toBeTruthy();
  });

  it('carries the brand on hub screens without a back button', async () => {
    await render(<AppHeader />);
    expect(screen.getByLabelText('Lentine Alexis')).toBeTruthy();
  });

  it('defaults the right slot to the account avatar, which opens /account', async () => {
    await render(<AppHeader onBack={() => {}} />);
    const avatar = screen.getByLabelText('Account');
    expect(screen.getByText('M')).toBeTruthy(); // the member's initial
    await fireEvent.press(avatar);
    expect(mockPush).toHaveBeenCalledWith('/account');
  });

  it('right={null} suppresses the avatar (the account screen itself)', async () => {
    await render(<AppHeader onBack={() => {}} right={null} />);
    expect(screen.queryByLabelText('Account')).toBeNull();
  });

  it('a custom right slot replaces the avatar', async () => {
    await render(<AppHeader right={<Text>R</Text>} />);
    expect(screen.getByText('R')).toBeTruthy();
    expect(screen.queryByLabelText('Account')).toBeNull();
  });

  it('pairs a favorites heart with the avatar, opening /favorites', async () => {
    await render(<AppHeader />);
    await fireEvent.press(screen.getByLabelText('Favorites'));
    expect(mockPush).toHaveBeenCalledWith('/favorites');
  });

  it('suppresses the heart alongside the avatar for custom/empty right slots', async () => {
    await render(<AppHeader right={null} />);
    expect(screen.queryByLabelText('Favorites')).toBeNull();
  });
});

describe('BackGlyph', () => {
  it('tints white on dark backgrounds', async () => {
    await render(<BackGlyph onPress={() => {}} dark />);
    expect(flatStyle(screen.getByText('←')).color).toBe(colors.white);
  });

  it('tints navy on light backgrounds', async () => {
    await render(<BackGlyph onPress={() => {}} />);
    expect(flatStyle(screen.getByText('←')).color).toBe(colors.blue);
  });
});
