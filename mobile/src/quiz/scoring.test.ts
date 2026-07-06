/// <reference types="jest" />
import { DOSHA } from './doshas';
import { QUESTIONS } from './questions';
import { computeResult, quizProgressPct, tally } from './scoring';
import type { Answer, DoshaKey } from './types';

/** Build an answer array of the given length, filling `repeat` to set leanings. */
function answers(...vals: Answer[]): Answer[] {
  return vals;
}

describe('tally', () => {
  it('counts each dosha and ignores nulls', () => {
    expect(tally(['vata', 'vata', 'pitta', null, 'kapha', null])).toEqual({
      vata: 2,
      pitta: 1,
      kapha: 1,
    });
  });

  it('returns all zeros for an empty/unanswered quiz', () => {
    expect(tally([null, null, null])).toEqual({ vata: 0, pitta: 0, kapha: 0 });
  });
});

describe('computeResult', () => {
  it('picks the clear leader — vata', () => {
    const r = computeResult(answers('vata', 'vata', 'vata', 'pitta', 'kapha'));
    expect(r.primary).toBe('vata');
    expect(r.tie).toBe(false);
    expect(r.winners).toEqual(['vata']);
  });

  it('picks the clear leader — pitta', () => {
    const r = computeResult(answers('pitta', 'pitta', 'pitta', 'vata', 'kapha'));
    expect(r.primary).toBe('pitta');
    expect(r.tie).toBe(false);
  });

  it('picks the clear leader — kapha', () => {
    const r = computeResult(answers('kapha', 'kapha', 'kapha', 'vata', 'pitta'));
    expect(r.primary).toBe('kapha');
    expect(r.tie).toBe(false);
  });

  it('breaks a two-way tie deterministically in vata > pitta > kapha order', () => {
    // pitta and kapha tie at 2 each; pitta wins by order.
    const r = computeResult(answers('pitta', 'pitta', 'kapha', 'kapha', 'vata'));
    expect(r.primary).toBe('pitta');
    expect(r.tie).toBe(true);
    expect(r.winners).toEqual(['pitta', 'kapha']);
  });

  it('breaks a three-way tie toward vata', () => {
    const r = computeResult(answers('vata', 'pitta', 'kapha'));
    expect(r.primary).toBe('vata');
    expect(r.tie).toBe(true);
    expect(r.winners).toEqual(['vata', 'pitta', 'kapha']);
  });

  it('returns the full tally alongside the result', () => {
    const r = computeResult(answers('vata', 'vata', 'pitta'));
    expect(r.tally).toEqual({ vata: 2, pitta: 1, kapha: 0 });
  });
});

describe('quiz data integrity (port guard)', () => {
  it('has 12 questions', () => {
    expect(QUESTIONS).toHaveLength(12);
  });

  it('every question has exactly 3 options, one per dosha', () => {
    for (const q of QUESTIONS) {
      expect(q.a).toHaveLength(3);
      const doshas = q.a.map((o) => o.d).sort();
      expect(doshas).toEqual<DoshaKey[]>(['kapha', 'pitta', 'vata']);
      expect(q.cat.length).toBeGreaterThan(0);
      expect(q.q.length).toBeGreaterThan(0);
    }
  });

  it('defines complete content for all three doshas', () => {
    for (const key of ['vata', 'pitta', 'kapha'] as DoshaKey[]) {
      const d = DOSHA[key];
      expect(d).toBeDefined();
      expect(d.name.length).toBeGreaterThan(0);
      expect(d.elements.length).toBeGreaterThan(0);
      expect(d.balanced.length).toBeGreaterThan(0);
      expect(d.imbalanced.length).toBeGreaterThan(0);
      expect(d.care.length).toBeGreaterThan(0);
    }
    expect(DOSHA.vata.code).toBe(1);
    expect(DOSHA.pitta.code).toBe(2);
    expect(DOSHA.kapha.code).toBe(3);
  });

  it('answering every question as one dosha yields that dosha', () => {
    const allVata: Answer[] = QUESTIONS.map(() => 'vata');
    const r = computeResult(allVata);
    expect(r.primary).toBe('vata');
    expect(r.tally.vata).toBe(12);
    expect(r.tie).toBe(false);
  });
});

describe('quizProgressPct', () => {
  it('shows visible progress on the first question', () => {
    expect(quizProgressPct(0, 12)).toBeCloseTo(100 / 12);
  });

  it('fills the bar on the final question', () => {
    expect(quizProgressPct(11, 12)).toBe(100);
  });

  it('tracks the "Question N of M" label at the midpoint', () => {
    expect(quizProgressPct(5, 12)).toBe(50);
  });

  it('never exceeds the bar or goes negative', () => {
    expect(quizProgressPct(20, 12)).toBe(100);
    expect(quizProgressPct(-2, 12)).toBe(0);
    expect(quizProgressPct(0, 0)).toBe(0);
  });
});
