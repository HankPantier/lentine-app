// stripe-webhook — Stripe → Supabase subscription sync (see sync.ts for the logic).
//
// Handles (per supabase/README.md):
//   customer.subscription.updated  → sync status/tier/interval/periods/cancel flag
//   customer.subscription.deleted  → sync (retrieved sub reads status 'canceled' → 'cancelled')
//   invoice.payment_succeeded      → sync (fresh period bounds)
//   invoice.payment_failed         → sync (status 'past_due')
//   customer.subscription.trial_will_end → acknowledged + logged only (v1)
//
// Every event funnels into syncFromStripe(subscriptionId), which retrieves the subscription
// live from Stripe and writes absolute values — idempotent, order-independent.
//
// Deploy with JWT verification OFF at the gateway (Stripe sends no Supabase JWT); authenticity
// comes from the webhook signature instead:
//   supabase functions deploy stripe-webhook --no-verify-jwt
//   supabase secrets set STRIPE_SECRET_KEY=sk_... STRIPE_WEBHOOK_SECRET=whsec_...
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-provisioned in the function runtime.

import Stripe from 'npm:stripe@18';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { type StripeSubLike, type SyncDeps, syncFromStripe } from './sync.ts';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const stripe = new Stripe(STRIPE_SECRET_KEY);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

/** Warm-isolate memo — the two tier rows are static. */
let tierIdsMemo: Record<string, string> | null = null;

const deps: SyncDeps = {
  retrieveSubscription: async (id) => (await stripe.subscriptions.retrieve(id)) as unknown as StripeSubLike,

  getTierIds: async () => {
    if (tierIdsMemo) return tierIdsMemo;
    const { data, error } = await adminClient().from('subscription_tiers').select('id, slug');
    if (error || !data) throw new Error(`tier lookup failed: ${error?.message}`);
    tierIdsMemo = Object.fromEntries(data.map((t) => [t.slug as string, t.id as string]));
    return tierIdsMemo;
  },

  // Match by subscription id first; migration-era rows only carry a customer id, so fall back
  // to that (sync.ts backfills stripe_subscription_id on a customer match).
  findRow: async (subscriptionId, customerId) => {
    const admin = adminClient();
    const bySub = await admin
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle();
    if (bySub.data) return { id: bySub.data.id as string, matchedBy: 'subscription' };
    if (!customerId) return null;
    const byCustomer = await admin
      .from('subscriptions')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    if (byCustomer.data) return { id: byCustomer.data.id as string, matchedBy: 'customer' };
    return null;
  },

  updateRow: async (rowId, update) => {
    const { error } = await adminClient().from('subscriptions').update(update).eq('id', rowId);
    if (error) throw new Error(`subscriptions update failed: ${error.message}`);
  },

  log: (msg) => console.log(msg),
};

/** The subscription id an event is about, or null when the event carries none. */
// deno-lint-ignore no-explicit-any
function subscriptionIdOf(event: any): string | null {
  const obj = event?.data?.object;
  if (event.type?.startsWith('customer.subscription.')) return (obj?.id as string | undefined) ?? null;
  if (event.type?.startsWith('invoice.')) {
    // Older API versions: invoice.subscription; newer: under parent.subscription_details.
    const direct = obj?.subscription;
    if (typeof direct === 'string') return direct;
    if (direct?.id) return direct.id as string;
    const nested = obj?.parent?.subscription_details?.subscription;
    if (typeof nested === 'string') return nested;
    if (nested?.id) return nested.id as string;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) return json({ error: 'stripe not configured' }, 500);

  // Signature verification needs the RAW body. constructEventAsync is required on Deno
  // (SubtleCrypto is async-only).
  const signature = req.headers.get('stripe-signature');
  if (!signature) return json({ error: 'missing signature' }, 400);
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log(`stripe-webhook: signature verification failed: ${(err as Error).message}`);
    return json({ error: 'invalid signature' }, 400);
  }

  if (event.type === 'customer.subscription.trial_will_end') {
    console.log(`stripe-webhook: trial_will_end acknowledged (no action in v1): ${event.id}`);
    return json({ received: true });
  }

  const subscriptionId = subscriptionIdOf(event);
  if (!subscriptionId) {
    console.log(`stripe-webhook: ${event.type} (${event.id}) carries no subscription id — skipping`);
    return json({ received: true });
  }

  try {
    const result = await syncFromStripe(subscriptionId, deps);
    return json({ received: true, ...result });
  } catch (err) {
    // Transport/database failure — 500 so Stripe retries.
    console.error(`stripe-webhook: sync failed for ${subscriptionId}: ${(err as Error).message}`);
    return json({ error: 'sync failed' }, 500);
  }
});
