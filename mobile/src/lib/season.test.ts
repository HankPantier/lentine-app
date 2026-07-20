import { currentSeason } from './season';

describe('currentSeason', () => {
  // Meteorological seasons: Mar-May spring, Jun-Aug summer, Sep-Nov fall, Dec-Feb winter.
  it.each([
    ['2026-02-28T12:00:00', 'winter'],
    ['2026-03-01T12:00:00', 'spring'],
    ['2026-05-31T12:00:00', 'spring'],
    ['2026-06-01T12:00:00', 'summer'],
    ['2026-08-31T12:00:00', 'summer'],
    ['2026-09-01T12:00:00', 'fall'],
    ['2026-11-30T12:00:00', 'fall'],
    ['2026-12-01T12:00:00', 'winter'],
  ])('%s → %s', (iso, expected) => {
    expect(currentSeason(new Date(iso))).toBe(expected);
  });

  it('defaults to the current date', () => {
    expect(currentSeason()).toBe(currentSeason(new Date()));
  });
});
