import type { Mode } from './state';

/**
 * Progress steps per flow. The new-user flow collects a profile and presents membership
 * (in-app purchase arrives with Stripe — until then the membership step is informational, and
 * the old tier/billing/payment screens are gone: the mock payment form must not be reachable
 * by real users). The returning-member ("migrating") flow signs in and confirms an existing
 * subscription. `home` is the post-onboarding destination, not a progress step.
 */
const FLOW_STEPS = {
  new: ['signup', 'profile', 'quiz_intro', 'quiz', 'result', 'membership', 'notifications'],
  migrating: ['signin', 'quiz_intro', 'quiz', 'result', 'tier_confirm', 'notifications'],
} as const;

export type Flow = keyof typeof FLOW_STEPS;
export type StepKey = (typeof FLOW_STEPS)[Flow][number];

export function flowOf(mode: Mode | null): Flow {
  return mode === 'migrating' ? 'migrating' : 'new';
}

/** Progress-dot position for a step within the active flow. */
export function progress(mode: Mode | null, key: StepKey): { current: number; total: number } {
  const steps: readonly string[] = FLOW_STEPS[flowOf(mode)];
  const idx = steps.indexOf(key);
  return { current: idx < 0 ? 0 : idx, total: steps.length };
}
