import { QUESTIONS } from '@/quiz/questions';
import { computeResult } from '@/quiz/scoring';
import type { Answer } from '@/quiz/types';
import { asAnswers, asTally, isDoshaKey } from './dosha-encoding';

describe('isDoshaKey', () => {
  it('accepts the three dosha keys and rejects anything else', () => {
    expect(isDoshaKey('vata')).toBe(true);
    expect(isDoshaKey('pitta')).toBe(true);
    expect(isDoshaKey('kapha')).toBe(true);
    expect(isDoshaKey('')).toBe(false);
    expect(isDoshaKey(null)).toBe(false);
    expect(isDoshaKey(undefined)).toBe(false);
    expect(isDoshaKey('VATA')).toBe(false);
  });
});

describe('asTally', () => {
  it('round-trips a real quiz tally through jsonb (stringify → parse → asTally)', () => {
    const answers: Answer[] = [
      'vata', 'vata', 'vata', 'vata', 'vata',
      'pitta', 'pitta', 'pitta', 'pitta',
      'kapha', 'kapha', 'kapha',
    ];
    const { tally } = computeResult(answers);
    const fromDb = asTally(JSON.parse(JSON.stringify(tally)));
    expect(fromDb).toEqual({ vata: 5, pitta: 4, kapha: 3 });
  });

  it('defaults missing or non-numeric counts to 0', () => {
    expect(asTally({ vata: 2 })).toEqual({ vata: 2, pitta: 0, kapha: 0 });
    expect(asTally({ vata: 'x', pitta: 3 })).toEqual({ vata: 0, pitta: 3, kapha: 0 });
  });

  it('returns null for non-object input', () => {
    expect(asTally(null)).toBeNull();
    expect(asTally(undefined)).toBeNull();
    expect(asTally('vata')).toBeNull();
  });
});

describe('asAnswers', () => {
  it('round-trips a full answers array through jsonb', () => {
    const answers: Answer[] = QUESTIONS.map((_, i) =>
      i % 3 === 0 ? 'vata' : i % 3 === 1 ? 'pitta' : 'kapha',
    );
    expect(asAnswers(JSON.parse(JSON.stringify(answers)))).toEqual(answers);
  });

  it('always returns exactly QUESTIONS.length entries', () => {
    expect(asAnswers([])).toHaveLength(QUESTIONS.length);
    expect(asAnswers(['vata'])).toHaveLength(QUESTIONS.length);
    // extra entries beyond the quiz length are dropped
    expect(asAnswers(Array(QUESTIONS.length + 5).fill('vata'))).toHaveLength(QUESTIONS.length);
  });

  it('preserves nulls and coerces invalid entries to null', () => {
    const input = ['vata', null, 'bogus', 42, 'kapha'];
    const out = asAnswers(input)!;
    expect(out[0]).toBe('vata');
    expect(out[1]).toBeNull();
    expect(out[2]).toBeNull();
    expect(out[3]).toBeNull();
    expect(out[4]).toBe('kapha');
  });

  it('returns null for non-array input', () => {
    expect(asAnswers(null)).toBeNull();
    expect(asAnswers({ 0: 'vata' })).toBeNull();
    expect(asAnswers('vata')).toBeNull();
  });
});
