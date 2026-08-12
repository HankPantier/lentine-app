import { clampStep, nextStep, prevStep } from './cook-nav';

describe('clampStep', () => {
  it('keeps an in-range index', () => {
    expect(clampStep(1, 3)).toBe(1);
  });

  it('clamps below 0 up to 0', () => {
    expect(clampStep(-1, 3)).toBe(0);
  });

  it('clamps past the end to the last index', () => {
    expect(clampStep(5, 3)).toBe(2);
  });

  it('returns 0 for an empty list', () => {
    expect(clampStep(0, 0)).toBe(0);
    expect(clampStep(3, 0)).toBe(0);
  });
});

describe('nextStep / prevStep', () => {
  it('advances but does not wrap past the last step', () => {
    expect(nextStep(0, 3)).toBe(1);
    expect(nextStep(2, 3)).toBe(2);
  });

  it('goes back but does not wrap below the first step', () => {
    expect(prevStep(2, 3)).toBe(1);
    expect(prevStep(0, 3)).toBe(0);
  });

  it('is safe on a single-step recipe', () => {
    expect(nextStep(0, 1)).toBe(0);
    expect(prevStep(0, 1)).toBe(0);
  });
});
