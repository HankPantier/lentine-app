import type { Subscription, Tier } from '@/onboarding/state';
import { type AccessItem, canAccess, entitledTier, hasActiveSubscription } from './entitlement';

function sub(status: string, tier: Tier = 'recipe'): Subscription {
  return { tier, interval: 'month', status, currentPeriodEnd: null };
}

describe('hasActiveSubscription', () => {
  it('unlocks for active and trialing', () => {
    expect(hasActiveSubscription(sub('active'))).toBe(true);
    expect(hasActiveSubscription(sub('trialing'))).toBe(true);
  });

  it('stays locked for lapsed/none', () => {
    expect(hasActiveSubscription(sub('cancelled'))).toBe(false);
    expect(hasActiveSubscription(sub('past_due'))).toBe(false);
    expect(hasActiveSubscription(null)).toBe(false);
  });
});

describe('entitledTier', () => {
  it('returns the tier only when the subscription entitles', () => {
    expect(entitledTier(sub('active', 'recipe'))).toBe('recipe');
    expect(entitledTier(sub('trialing', 'back_to_forward'))).toBe('back_to_forward');
  });

  it('returns null for lapsed or missing subscriptions', () => {
    expect(entitledTier(sub('cancelled', 'back_to_forward'))).toBeNull();
    expect(entitledTier(sub('past_due'))).toBeNull();
    expect(entitledTier(null)).toBeNull();
  });
});

describe('canAccess', () => {
  const recipe: AccessItem = { type: 'recipe', visibility: 'paid' };
  const post: AccessItem = { type: 'post', visibility: 'paid' };
  const freeRecipe: AccessItem = { type: 'recipe', visibility: 'free' };
  const freePost: AccessItem = { type: 'post', visibility: 'free' };

  it('always unlocks free items, even signed-out', () => {
    expect(canAccess(freeRecipe, null)).toBe(true);
    expect(canAccess(freePost, null)).toBe(true);
    expect(canAccess(freePost, 'recipe')).toBe(true);
  });

  it('recipes unlock for either paid tier, never for null', () => {
    expect(canAccess(recipe, 'recipe')).toBe(true);
    expect(canAccess(recipe, 'back_to_forward')).toBe(true);
    expect(canAccess(recipe, null)).toBe(false);
  });

  it('back-to-forward posts unlock only for back_to_forward', () => {
    expect(canAccess(post, 'back_to_forward')).toBe(true);
    expect(canAccess(post, 'recipe')).toBe(false);
    expect(canAccess(post, null)).toBe(false);
  });
});
