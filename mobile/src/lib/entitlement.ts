import type { Subscription } from '@/onboarding/state';

/** Subscription statuses that unlock member content. Mirrors the wp-articles edge function. */
export const ENTITLING_STATUSES = ['active', 'trialing'];

/**
 * Whether a subscription unlocks paid content. Used for the instant locked/unlocked UI; the
 * wp-articles edge function independently re-verifies before returning any full article body.
 */
export function hasActiveSubscription(sub: Subscription | null): boolean {
  return !!sub && ENTITLING_STATUSES.includes(sub.status);
}
