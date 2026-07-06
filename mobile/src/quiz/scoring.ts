import type { Answer, DoshaKey, Tally } from './types';

/** Tie-break / display order. Matches the prototype (vata > pitta > kapha). */
export const DOSHA_ORDER: DoshaKey[] = ['vata', 'pitta', 'kapha'];

export interface QuizResult {
  /** The single leading dosha (deterministic even on a tie). */
  primary: DoshaKey;
  tally: Tally;
  /** True when two or more doshas share the top score. */
  tie: boolean;
  /** All doshas sharing the top score, in DOSHA_ORDER. */
  winners: DoshaKey[];
}

/** Count answers per dosha, ignoring unanswered (null) slots. */
export function tally(answers: Answer[]): Tally {
  const t: Tally = { vata: 0, pitta: 0, kapha: 0 };
  for (const a of answers) {
    if (a) t[a]++;
  }
  return t;
}

/**
 * Compute the primary dosha from a set of answers. Mirrors the prototype's showResults():
 * highest tally wins; on a tie the earliest in DOSHA_ORDER leads.
 */
export function computeResult(answers: Answer[]): QuizResult {
  const t = tally(answers);
  const max = Math.max(t.vata, t.pitta, t.kapha);
  const winners = DOSHA_ORDER.filter((k) => t[k] === max);
  return {
    primary: winners[0],
    tally: t,
    tie: winners.length > 1,
    winners,
  };
}

/**
 * Fill fraction (0–100) for the quiz progress bar. Counts the question currently being
 * answered — Q1 of 12 shows visible progress and the final question fills the bar — matching
 * the "Question N of M" label rendered beside it (a `current/total` bar reads 0% on Q1 and
 * never reaches 100%).
 */
export function quizProgressPct(current: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, ((current + 1) / total) * 100));
}
