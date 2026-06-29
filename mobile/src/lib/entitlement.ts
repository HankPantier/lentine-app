import type { Subscription, Tier } from '@/onboarding/state';

/** Subscription statuses that unlock member content. Mirrors the wp-articles edge function. */
export const ENTITLING_STATUSES = ['active', 'trialing'];

/**
 * Whether a subscription unlocks paid content. Used for the membership summary and as the
 * gate behind {@link entitledTier}; the wp-articles edge function independently re-verifies
 * before returning any full article body.
 */
export function hasActiveSubscription(sub: Subscription | null): boolean {
  return !!sub && ENTITLING_STATUSES.includes(sub.status);
}

/** The tier that currently grants access, or null when the subscription doesn't entitle. */
export function entitledTier(sub: Subscription | null): Tier | null {
  return hasActiveSubscription(sub) && sub ? sub.tier : null;
}

/** The fields of a feed item that determine whether its full body unlocks. */
export interface AccessItem {
  type: 'post' | 'recipe';
  visibility: 'free' | 'paid';
}

/**
 * Whether the given entitling tier can read the full body of an item. This drives the instant
 * locked/unlocked UI (lock badges); the wp-articles edge function's `canUnlock` re-verifies the
 * SAME rule server-side before returning any body — keep the two implementations identical:
 *   - `free` items: always readable (even signed-out).
 *   - `recipe` items: any paid tier (`recipe` or `back_to_forward`).
 *   - `post` items (Back to Forward): `back_to_forward` only.
 */
export function canAccess(item: AccessItem, tier: Tier | null): boolean {
  if (item.visibility === 'free') return true;
  if (item.type === 'recipe') return tier === 'recipe' || tier === 'back_to_forward';
  return tier === 'back_to_forward';
}
