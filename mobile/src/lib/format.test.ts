import { titleCase } from './format';

describe('titleCase', () => {
  it('capitalizes the first letter of a lowercased tag', () => {
    expect(titleCase('fall')).toBe('Fall');
    expect(titleCase('vata')).toBe('Vata');
  });

  it('leaves the rest of the label as-is', () => {
    expect(titleCase('Back to Forward')).toBe('Back to Forward');
  });

  it('handles the empty string', () => {
    expect(titleCase('')).toBe('');
  });
});
