import { splitName } from './name';

describe('splitName', () => {
  it('splits "First Last" into first + last', () => {
    expect(splitName('Alexis duPont')).toEqual({ firstName: 'Alexis', lastName: 'duPont' });
  });

  it('keeps multi-word last names together', () => {
    expect(splitName('Mary Anne Van Helsing')).toEqual({ firstName: 'Mary', lastName: 'Anne Van Helsing' });
  });

  it('handles a single name (no last name)', () => {
    expect(splitName('Madonna')).toEqual({ firstName: 'Madonna', lastName: '' });
  });

  it('collapses extra/edge whitespace', () => {
    expect(splitName('  Alexis   duPont  ')).toEqual({ firstName: 'Alexis', lastName: 'duPont' });
  });

  it('returns empty fields for an empty string', () => {
    expect(splitName('')).toEqual({ firstName: '', lastName: '' });
  });
});
