// deno test — pure-logic tests for the webhook's sync module (no real Stripe/Supabase).
// Run: deno test supabase/functions/stripe-webhook/

import { assertEquals } from 'jsr:@std/assert@1';
import {
  buildRowUpdate,
  mapStripeStatus,
  parseLookupKey,
  syncFromStripe,
  type StripeSubLike,
  type SyncDeps,
} from './sync.ts';

// --- parseLookupKey ---

Deno.test('parseLookupKey resolves all four price keys', () => {
  assertEquals(parseLookupKey('recipe_month'), { tier: 'recipe', interval: 'month' });
  assertEquals(parseLookupKey('recipe_year'), { tier: 'recipe', interval: 'year' });
  assertEquals(parseLookupKey('back_to_forward_month'), { tier: 'back_to_forward', interval: 'month' });
  assertEquals(parseLookupKey('back_to_forward_year'), { tier: 'back_to_forward', interval: 'year' });
});

Deno.test('parseLookupKey rejects unknown or missing keys', () => {
  assertEquals(parseLookupKey('premium_month'), null);
  assertEquals(parseLookupKey('recipe_week'), null);
  assertEquals(parseLookupKey('recipe'), null);
  assertEquals(parseLookupKey(''), null);
  assertEquals(parseLookupKey(null), null);
  assertEquals(parseLookupKey(undefined), null);
});

// --- mapStripeStatus ---

Deno.test('mapStripeStatus maps Stripe statuses onto our enum', () => {
  assertEquals(mapStripeStatus('active'), 'active');
  assertEquals(mapStripeStatus('trialing'), 'trialing');
  assertEquals(mapStripeStatus('past_due'), 'past_due');
  assertEquals(mapStripeStatus('canceled'), 'cancelled'); // Stripe spells it 'canceled'
  assertEquals(mapStripeStatus('unpaid'), 'past_due');
  assertEquals(mapStripeStatus('incomplete'), 'past_due');
  assertEquals(mapStripeStatus('incomplete_expired'), 'past_due');
});

Deno.test('mapStripeStatus returns null for unknown statuses', () => {
  assertEquals(mapStripeStatus('paused'), null);
  assertEquals(mapStripeStatus(''), null);
});

// --- buildRowUpdate ---

const TIER_IDS = { recipe: 'tier-recipe-uuid', back_to_forward: 'tier-btf-uuid' };

function stripeSub(overrides: Partial<StripeSubLike> = {}): StripeSubLike {
  return {
    id: 'sub_1',
    customer: 'cus_1',
    status: 'active',
    cancel_at_period_end: false,
    items: {
      data: [
        {
          price: { lookup_key: 'recipe_month' },
          // Newer Stripe API versions carry period bounds on the item.
          current_period_start: 1751328000, // 2025-07-01T00:00:00Z
          current_period_end: 1754006400, // 2025-08-01T00:00:00Z
        },
      ],
    },
    ...overrides,
  };
}

Deno.test('buildRowUpdate writes tier, interval, status, periods, cancel flag', () => {
  const update = buildRowUpdate(stripeSub(), TIER_IDS);
  assertEquals(update, {
    status: 'active',
    cancel_at_period_end: false,
    tier_id: 'tier-recipe-uuid',
    billing_interval: 'month',
    current_period_start: '2025-07-01T00:00:00.000Z',
    current_period_end: '2025-08-01T00:00:00.000Z',
  });
});

Deno.test('buildRowUpdate maps a tier switch to the new tier_id', () => {
  const update = buildRowUpdate(
    stripeSub({ items: { data: [{ price: { lookup_key: 'back_to_forward_year' } }] } }),
    TIER_IDS,
  );
  assertEquals(update?.tier_id, 'tier-btf-uuid');
  assertEquals(update?.billing_interval, 'year');
});

Deno.test('buildRowUpdate records cancel_at_period_end', () => {
  const update = buildRowUpdate(stripeSub({ cancel_at_period_end: true }), TIER_IDS);
  assertEquals(update?.cancel_at_period_end, true);
  assertEquals(update?.status, 'active'); // still active until the period ends
});

Deno.test('buildRowUpdate maps deleted subscriptions (status canceled) to cancelled', () => {
  const update = buildRowUpdate(stripeSub({ status: 'canceled' }), TIER_IDS);
  assertEquals(update?.status, 'cancelled');
});

Deno.test('buildRowUpdate falls back to top-level period bounds', () => {
  const update = buildRowUpdate(
    stripeSub({
      current_period_start: 1751328000,
      current_period_end: 1754006400,
      items: { data: [{ price: { lookup_key: 'recipe_month' } }] },
    }),
    TIER_IDS,
  );
  assertEquals(update?.current_period_start, '2025-07-01T00:00:00.000Z');
  assertEquals(update?.current_period_end, '2025-08-01T00:00:00.000Z');
});

Deno.test('buildRowUpdate leaves tier/interval untouched on an unparseable lookup key', () => {
  const update = buildRowUpdate(
    stripeSub({ items: { data: [{ price: { lookup_key: 'mystery_price' } }] } }),
    TIER_IDS,
  );
  assertEquals(update && 'tier_id' in update, false);
  assertEquals(update && 'billing_interval' in update, false);
  assertEquals(update?.status, 'active'); // status/periods still sync
});

Deno.test('buildRowUpdate returns null for an unmappable status (never violates the check constraint)', () => {
  assertEquals(buildRowUpdate(stripeSub({ status: 'paused' }), TIER_IDS), null);
});

// --- syncFromStripe ---

function fakeDeps(overrides: Partial<SyncDeps> = {}) {
  const updates: Array<{ rowId: string; update: Record<string, unknown> }> = [];
  const logs: string[] = [];
  const deps: SyncDeps = {
    retrieveSubscription: () => Promise.resolve(stripeSub()),
    getTierIds: () => Promise.resolve(TIER_IDS),
    findRow: () => Promise.resolve({ id: 'row-1', matchedBy: 'subscription' }),
    updateRow: (rowId, update) => {
      updates.push({ rowId, update });
      return Promise.resolve();
    },
    log: (msg) => logs.push(msg),
    ...overrides,
  };
  return { deps, updates, logs };
}

Deno.test('syncFromStripe updates the matched row with absolute values', async () => {
  const { deps, updates } = fakeDeps();
  const result = await syncFromStripe('sub_1', deps);
  assertEquals(result.ok, true);
  assertEquals(updates.length, 1);
  assertEquals(updates[0].rowId, 'row-1');
  assertEquals(updates[0].update.status, 'active');
  assertEquals(updates[0].update.tier_id, 'tier-recipe-uuid');
});

Deno.test('syncFromStripe backfills stripe_subscription_id when matched via customer', async () => {
  const { deps, updates } = fakeDeps({
    findRow: () => Promise.resolve({ id: 'row-2', matchedBy: 'customer' }),
  });
  await syncFromStripe('sub_1', deps);
  assertEquals(updates[0].update.stripe_subscription_id, 'sub_1');
});

Deno.test('syncFromStripe is a logged no-op for unknown subscriptions', async () => {
  const { deps, updates, logs } = fakeDeps({ findRow: () => Promise.resolve(null) });
  const result = await syncFromStripe('sub_unknown', deps);
  assertEquals(result.ok, true); // 200 to Stripe — no retry storms over unmapped test data
  assertEquals(result.reason, 'row_not_found');
  assertEquals(updates.length, 0);
  assertEquals(logs.length > 0, true);
});

Deno.test('syncFromStripe skips the write when the status is unmappable', async () => {
  const { deps, updates, logs } = fakeDeps({
    retrieveSubscription: () => Promise.resolve(stripeSub({ status: 'paused' })),
  });
  const result = await syncFromStripe('sub_1', deps);
  assertEquals(result.ok, true);
  assertEquals(result.reason, 'unmappable_status');
  assertEquals(updates.length, 0);
  assertEquals(logs.length > 0, true);
});
