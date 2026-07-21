import { MIN_QUERY_LEN, SEARCH_DEBOUNCE_MS, normalizeQuery } from './search';

describe('normalizeQuery', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeQuery('  chai  ')).toBe('chai');
  });

  it('collapses internal whitespace runs', () => {
    expect(normalizeQuery('golden   milk\tlatte')).toBe('golden milk latte');
  });

  it('passes a plain query through', () => {
    expect(normalizeQuery('kitchari')).toBe('kitchari');
  });

  it('returns null for empty input', () => {
    expect(normalizeQuery('')).toBeNull();
  });

  it('returns null for whitespace-only input', () => {
    expect(normalizeQuery('   ')).toBeNull();
  });

  it('returns null under the minimum length', () => {
    expect(normalizeQuery('a')).toBeNull();
    expect(normalizeQuery(' a ')).toBeNull();
  });

  it('accepts exactly the minimum length', () => {
    expect(normalizeQuery('ab')).toBe('ab');
  });
});

describe('constants', () => {
  it('exposes sane values', () => {
    expect(MIN_QUERY_LEN).toBe(2);
    expect(SEARCH_DEBOUNCE_MS).toBeGreaterThanOrEqual(200);
  });
});
