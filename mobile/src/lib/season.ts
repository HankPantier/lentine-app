export type Season = 'spring' | 'summer' | 'fall' | 'winter';

/**
 * The current meteorological season from the device clock: Mar–May spring, Jun–Aug summer,
 * Sep–Nov fall, Dec–Feb winter. Matches the lowercased ACF `season` tags on recipes, so the
 * home feed can favor in-season content by default.
 */
export function currentSeason(date: Date = new Date()): Season {
  const m = date.getMonth(); // 0-based
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'fall';
  return 'winter';
}
