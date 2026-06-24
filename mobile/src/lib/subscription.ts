import type { Interval, Subscription, Tier } from '@/onboarding/state';
import { supabase } from './supabase';

// PostgREST embeds a many-to-one relation as an object, but older clients typed it as an
// array — handle both so the tier slug resolves on every platform/version.
type TierRel = { slug: Tier } | { slug: Tier }[] | null;
function slugOf(rel: TierRel): Tier | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0]?.slug ?? null) : rel.slug;
}

/**
 * Read the signed-in member's subscription (RLS scopes it to their own row). Returns null
 * for users without one (e.g. brand-new sign-ups). The tier slug is resolved via the
 * subscription_tiers FK join.
 */
export async function fetchSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('status, billing_interval, current_period_end, subscription_tiers(slug)')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  const tier = slugOf(data.subscription_tiers as TierRel);
  if (!tier) return null;

  return {
    tier,
    interval: data.billing_interval as Interval,
    status: data.status as string,
    currentPeriodEnd: (data.current_period_end as string | null) ?? null,
  };
}
