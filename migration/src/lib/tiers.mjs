// Pure mapping helpers: WooCommerce product/status/period → Supabase enums.
// No I/O — unit-tested in tiers.test.mjs.

// Tier slugs, ranked low→high. back_to_forward includes recipe access.
export const TIER_RANK = { recipe: 1, back_to_forward: 2 };

/**
 * Map a WooCommerce subscription product/line-item name to a Supabase tier slug.
 * Observed names: "Recipe Club Subscription (Monthly)", "Recipe Library Subscription (Annual)",
 * "Back to Forward Membership - Monthly", etc. Returns null if unrecognised (caller flags it).
 */
export function tierFromProductName(name) {
  if (!name) return null;
  const n = String(name).trim().toLowerCase();
  if (n.startsWith('back to forward')) return 'back_to_forward';
  if (n.startsWith('recipe')) return 'recipe';
  return null;
}

/** Higher-ranked of two tier slugs (for users holding both). */
export function higherTier(a, b) {
  if (!a) return b;
  if (!b) return a;
  return (TIER_RANK[a] ?? 0) >= (TIER_RANK[b] ?? 0) ? a : b;
}

/**
 * Map a WooCommerce subscription post_status to a Supabase subscription status.
 * Only statuses we actually import are mapped; anything else throws so surprises surface.
 */
export function statusFromWcStatus(wcStatus) {
  switch (wcStatus) {
    case 'wc-active':
      return 'active';
    case 'wc-pending-cancel': // still has access until period end
      return 'active';
    case 'wc-on-hold':
      return 'past_due';
    case 'wc-cancelled':
      return 'cancelled';
    case 'wc-expired':
      return 'cancelled';
    default:
      throw new Error(`Unmapped WooCommerce subscription status: ${wcStatus}`);
  }
}

/** Map WooCommerce _billing_period to the Supabase billing_interval enum (month|year). */
export function billingIntervalFromPeriod(period) {
  const p = String(period || '').trim().toLowerCase();
  if (p === 'month') return 'month';
  if (p === 'year') return 'year';
  throw new Error(`Unsupported billing period: ${period}`);
}
