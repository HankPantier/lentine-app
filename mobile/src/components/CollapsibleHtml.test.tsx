import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { CollapsibleHtml, shouldCollapse } from './CollapsibleHtml';

describe('shouldCollapse', () => {
  it('is false until measured', () => {
    expect(shouldCollapse(null, 220)).toBe(false);
  });

  it('is true when content exceeds the collapsed height (plus slop)', () => {
    expect(shouldCollapse(600, 220)).toBe(true);
  });

  it('is false for short content', () => {
    expect(shouldCollapse(100, 220)).toBe(false);
  });

  it('ignores content only marginally over the max (within slop)', () => {
    expect(shouldCollapse(224, 220)).toBe(false);
  });
});

describe('CollapsibleHtml', () => {
  const measure = (height: number) =>
    fireEvent(screen.getByTestId('collapsible-inner'), 'layout', {
      nativeEvent: { layout: { height, width: 320, x: 0, y: 0 } },
    });

  it('shows no toggle before the content is measured', async () => {
    await render(
      <CollapsibleHtml>
        <Text>Some long recipe description.</Text>
      </CollapsibleHtml>,
    );
    expect(screen.queryByText(/read more/i)).toBeNull();
    expect(screen.queryByText(/read less/i)).toBeNull();
  });

  it('shows "Read more" once tall content is measured', async () => {
    await render(
      <CollapsibleHtml collapsedMaxHeight={220}>
        <Text>Some long recipe description.</Text>
      </CollapsibleHtml>,
    );
    measure(600);
    expect(await screen.findByText(/read more/i)).toBeTruthy();
  });

  it('toggles to "Read less" when expanded', async () => {
    await render(
      <CollapsibleHtml collapsedMaxHeight={220}>
        <Text>Some long recipe description.</Text>
      </CollapsibleHtml>,
    );
    measure(600);
    fireEvent.press(await screen.findByText(/read more/i));
    expect(await screen.findByText(/read less/i)).toBeTruthy();
  });

  it('shows no toggle for short content', async () => {
    await render(
      <CollapsibleHtml collapsedMaxHeight={220}>
        <Text>Short.</Text>
      </CollapsibleHtml>,
    );
    measure(120);
    expect(screen.queryByText(/read more/i)).toBeNull();
  });
});
