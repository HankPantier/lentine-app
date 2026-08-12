import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { RecipeStructured } from '@/lib/articles';
import { CookMode } from './CookMode';

// The native wake-lock module isn't available under jest; the hook is a no-op here.
jest.mock('expo-keep-awake', () => ({ useKeepAwake: () => {} }));

const METRICS = {
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
  frame: { x: 0, y: 0, width: 320, height: 640 },
};

const steps: RecipeStructured['instructions'] = [
  { headline: 'Prep the cucumbers', content: '<p>Slice them thin.</p>' },
  { headline: 'Make the dressing', content: '<p>Whisk lime and fish sauce.</p>' },
];

async function renderCookMode() {
  const onClose = jest.fn();
  const utils = await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <CookMode
        visible
        onClose={onClose}
        title="Tomato Salad"
        instructions={steps}
        contentWidth={320}
      />
    </SafeAreaProvider>,
  );
  return { onClose, ...utils };
}

describe('CookMode', () => {
  it('opens on the first step', async () => {
    await renderCookMode();
    expect(screen.getByText('Prep the cucumbers')).toBeTruthy();
    expect(screen.getByText('1 of 2')).toBeTruthy();
  });

  it('walks Next then Prev through the steps', async () => {
    await renderCookMode();
    fireEvent.press(screen.getByText('Next'));
    expect(await screen.findByText('Make the dressing')).toBeTruthy();
    expect(screen.getByText('2 of 2')).toBeTruthy();
    fireEvent.press(screen.getByText('Prev'));
    expect(await screen.findByText('Prep the cucumbers')).toBeTruthy();
    expect(screen.getByText('1 of 2')).toBeTruthy();
  });

  it('closes via Done', async () => {
    const { onClose } = await renderCookMode();
    fireEvent.press(screen.getByText(/done/i));
    expect(onClose).toHaveBeenCalled();
  });
});
