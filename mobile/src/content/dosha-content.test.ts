import { DOSHA } from '@/quiz/doshas';
import type { DoshaKey } from '@/quiz/types';
import { DOSHA_CONTENT } from './dosha-content';

const KEYS: DoshaKey[] = ['vata', 'pitta', 'kapha'];

describe('DOSHA_CONTENT', () => {
  it('covers every dosha key, and only those', () => {
    expect(Object.keys(DOSHA_CONTENT).sort()).toEqual([...KEYS].sort());
  });

  it.each(KEYS)('has complete, non-empty content for %s', (key) => {
    const c = DOSHA_CONTENT[key];
    expect(c.focus.trim().length).toBeGreaterThan(0);
    expect(c.ritual.title.trim().length).toBeGreaterThan(0);
    expect(c.ritual.meta.trim().length).toBeGreaterThan(0);
    expect(c.recipe.title.trim().length).toBeGreaterThan(0);
    expect(c.recipe.meta.trim().length).toBeGreaterThan(0);
  });

  it('aligns with the dosha definitions used to render it', () => {
    // The /today screen looks up DOSHA[key] for accent/name alongside DOSHA_CONTENT[key];
    // a key in one but not the other would render a broken screen.
    expect(Object.keys(DOSHA_CONTENT).sort()).toEqual(Object.keys(DOSHA).sort());
  });
});
