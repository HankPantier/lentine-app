import type { Interval, Tier } from './state';

export const TIER_NAME: Record<Tier, string> = {
  recipe: 'Recipe Club',
  back_to_forward: 'Back to Forward',
};

/** Price in whole dollars per billing interval. */
export const PRICE: Record<Tier, Record<Interval, number>> = {
  recipe: { month: 9, year: 84 },
  back_to_forward: { month: 29, year: 276 },
};

/** Dollars-per-month for display (annual shown as its monthly equivalent). */
export function monthlyEquivalent(tier: Tier, interval: Interval): number {
  return interval === 'year' ? PRICE[tier].year / 12 : PRICE[tier].month;
}

/** Annual saving vs paying monthly for a year. */
export function annualSavings(tier: Tier): number {
  return PRICE[tier].month * 12 - PRICE[tier].year;
}

/** The amount charged now. */
export function totalDue(tier: Tier, interval: Interval): number {
  return PRICE[tier][interval];
}

export function money(n: number): string {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

/** The public website — membership purchase lives there until in-app Stripe billing ships. */
export const SITE_URL = 'https://lentinealexis.com';
