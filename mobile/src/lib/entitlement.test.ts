import type { Subscription } from '@/onboarding/state';
import { hasActiveSubscription } from './entitlement';

function sub(status: string): Subscription {
  return { tier: 'recipe', interval: 'month', status, currentPeriodEnd: null };
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
