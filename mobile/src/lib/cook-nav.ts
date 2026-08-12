// Pure step-navigation for Cook Mode. Indices clamp to the valid range and never wrap, so
// the Prev/Next buttons can disable at the ends and a bad index can never crash the view.

/** Clamp an index to [0, total-1]; an empty list collapses to 0. */
export function clampStep(index: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(Math.max(index, 0), total - 1);
}

/** Advance one step, stopping at the last. */
export function nextStep(index: number, total: number): number {
  return clampStep(index + 1, total);
}

/** Go back one step, stopping at the first. */
export function prevStep(index: number, total: number): number {
  return clampStep(index - 1, total);
}
