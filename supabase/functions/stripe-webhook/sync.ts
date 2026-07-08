// stripe-webhook sync logic — pure and dependency-injected so it tests without Stripe/Supabase.
//
// Every handled event funnels into syncFromStripe(subscriptionId): retrieve the subscription
// LIVE from Stripe and write absolute values into the `subscriptions` row. That makes handling
// idempotent and immune to out-of-order webhook delivery — no event bookkeeping needed.
//
// Price → tier mapping rides on Stripe price `lookup_key`s, named `<tier>_<interval>`:
//   recipe_month · recipe_year · back_to_forward_month · back_to_forward_year
// An unparseable key still syncs status/periods but leaves tier/interval untouched (a miswired
// price in the dashboard must never silently retier a member).

export type Tier = 'recipe' | 'back_to_forward';
export type Interval = 'month' | 'year';
export type OurStatus = 'active' | 'cancelled' | 'past_due' | 'trialing';

/** The slice of a Stripe Subscription this module reads (works across API versions). */
export interface StripeSubLike {
  id: string;
  customer: string | { id: string };
  status: string;
  cancel_at_period_end?: boolean;
  // Older API versions: period bounds on the subscription…
  current_period_start?: number;
  current_period_end?: number;
  items?: {
    data?: Array<{
      price?: { lookup_key?: string | null } | null;
      // …newer versions: on the item.
      current_period_start?: number;
      current_period_end?: number;
    }>;
  };
}

export interface SyncDeps {
  retrieveSubscription: (id: string) => Promise<StripeSubLike>;
  /** slug → subscription_tiers.id */
  getTierIds: () => Promise<Record<string, string>>;
  findRow: (
    subscriptionId: string,
    customerId: string | null,
  ) => Promise<{ id: string; matchedBy: 'subscription' | 'customer' } | null>;
  updateRow: (rowId: string, update: Record<string, unknown>) => Promise<void>;
  log: (msg: string) => void;
}

export function parseLookupKey(key: string | null | undefined): { tier: Tier; interval: Interval } | null {
  const m = /^(recipe|back_to_forward)_(month|year)$/.exec(key ?? '');
  if (!m) return null;
  return { tier: m[1] as Tier, interval: m[2] as Interval };
}

/**
 * Stripe status → our `subscriptions.status` enum. Unknown values return null and the write is
 * skipped — the table's check constraint must never see a value outside its list.
 */
export function mapStripeStatus(status: string): OurStatus | null {
  switch (status) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
      return 'past_due';
    case 'canceled': // Stripe's spelling; ours is 'cancelled'
      return 'cancelled';
    default:
      return null;
  }
}

function isoFromUnix(seconds: number | undefined): string | null {
  return typeof seconds === 'number' ? new Date(seconds * 1000).toISOString() : null;
}

/**
 * The absolute row update for a Stripe subscription, or null when the status can't be mapped.
 * Tier/interval are included only when the price's lookup key parses.
 */
export function buildRowUpdate(
  sub: StripeSubLike,
  tierIdBySlug: Record<string, string>,
): Record<string, unknown> | null {
  const status = mapStripeStatus(sub.status);
  if (!status) return null;

  const update: Record<string, unknown> = {
    status,
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
  };

  const item = sub.items?.data?.[0];
  const start = isoFromUnix(item?.current_period_start ?? sub.current_period_start);
  const end = isoFromUnix(item?.current_period_end ?? sub.current_period_end);
  if (start) update.current_period_start = start;
  if (end) update.current_period_end = end;

  const parsed = parseLookupKey(item?.price?.lookup_key);
  if (parsed && tierIdBySlug[parsed.tier]) {
    update.tier_id = tierIdBySlug[parsed.tier];
    update.billing_interval = parsed.interval;
  }
  return update;
}

/**
 * Retrieve the subscription from Stripe and sync its row. Always resolves ok:true for business
 * outcomes (unknown row, unmappable status) so the webhook can 200 — Stripe retries are for
 * transport failures, not for data we've chosen not to store.
 */
export async function syncFromStripe(
  subscriptionId: string,
  deps: SyncDeps,
): Promise<{ ok: boolean; reason?: string }> {
  const sub = await deps.retrieveSubscription(subscriptionId);
  const customerId = typeof sub.customer === 'string' ? sub.customer : (sub.customer?.id ?? null);

  const row = await deps.findRow(subscriptionId, customerId);
  if (!row) {
    deps.log(`stripe-webhook: no subscriptions row for ${subscriptionId} / ${customerId} — skipping`);
    return { ok: true, reason: 'row_not_found' };
  }

  const update = buildRowUpdate(sub, await deps.getTierIds());
  if (!update) {
    deps.log(`stripe-webhook: unmappable status '${sub.status}' on ${subscriptionId} — skipping`);
    return { ok: true, reason: 'unmappable_status' };
  }

  // Matched via customer fallback (migration-era rows have customer ids but no sub id) —
  // backfill the subscription id so the next event matches directly.
  if (row.matchedBy === 'customer') update.stripe_subscription_id = subscriptionId;

  await deps.updateRow(row.id, update);
  return { ok: true };
}
