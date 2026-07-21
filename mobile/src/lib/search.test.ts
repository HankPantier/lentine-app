import { matchesQuery, MIN_QUERY_LEN, SEARCH_DEBOUNCE_MS, normalizeQuery } from './search';

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

describe('matchesQuery', () => {
  const item = { title: 'Golden Kitchari', excerpt: 'A warming, grounding bowl.', category: 'Nourish' };

  it('matches on title, case-insensitively', () => {
    expect(matchesQuery(item, 'kitchari')).toBe(true);
    expect(matchesQuery(item, 'GOLDEN')).toBe(true);
  });

  it('matches on excerpt', () => {
    expect(matchesQuery(item, 'grounding')).toBe(true);
  });

  it('matches on category', () => {
    expect(matchesQuery(item, 'nourish')).toBe(true);
  });

  it('does not match unrelated text', () => {
    expect(matchesQuery(item, 'chai')).toBe(false);
  });

  it('tolerates a null category', () => {
    expect(matchesQuery({ ...item, category: null }, 'nourish')).toBe(false);
    expect(matchesQuery({ ...item, category: null }, 'golden')).toBe(true);
  });

  it('matches multi-word substrings', () => {
    expect(matchesQuery(item, 'golden kitchari')).toBe(true);
    expect(matchesQuery(item, 'kitchari golden')).toBe(false);
  });
});

describe('constants', () => {
  it('exposes sane values', () => {
    expect(MIN_QUERY_LEN).toBe(2);
    expect(SEARCH_DEBOUNCE_MS).toBeGreaterThanOrEqual(200);
  });
});
