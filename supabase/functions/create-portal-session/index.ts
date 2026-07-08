// create-portal-session — a Stripe Customer Portal session for the signed-in member.
//
// POST { returnUrl? } with the caller's Supabase JWT →
//   { url }                        portal session URL (open in a browser)
//   { manageable: false, reason }  billing not manageable via Stripe → app shows web fallback
// See handler.ts for the logic and contract.
//
// Deploy with gateway JWT verification ON (the default — defense in depth; the handler
// verifies the JWT itself as well):
//   supabase functions deploy create-portal-session
//   supabase secrets set STRIPE_SECRET_KEY=sk_... PORTAL_RETURN_URL=https://... PORTAL_RETURN_ORIGINS=http://localhost:8081,https://...
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-provisioned in the function runtime.

import Stripe from 'npm:stripe@18';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handlePortalRequest, type PortalDeps } from './handler.ts';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const stripe = new Stripe(STRIPE_SECRET_KEY);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

const deps: PortalDeps = {
  getUser: async (token) => {
    const { data, error } = await adminClient().auth.getUser(token);
    return error || !data.user ? null : { id: data.user.id };
  },

  getSubscriptionRow: async (userId) => {
    const { data } = await adminClient()
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, status')
      .eq('user_id', userId)
      .maybeSingle();
    return (data as Awaited<ReturnType<PortalDeps['getSubscriptionRow']>>) ?? null;
  },

  createPortalSession: async (customer, returnUrl) => {
    const session = await stripe.billingPortal.sessions.create({ customer, return_url: returnUrl });
    return { url: session.url };
  },

  env: {
    PORTAL_RETURN_URL: Deno.env.get('PORTAL_RETURN_URL') ?? '',
    PORTAL_RETURN_ORIGINS: Deno.env.get('PORTAL_RETURN_ORIGINS') ?? '',
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (!STRIPE_SECRET_KEY) return json({ error: 'stripe not configured' }, 500);
  if (!deps.env.PORTAL_RETURN_URL) return json({ error: 'PORTAL_RETURN_URL not configured' }, 500);

  let body: { returnUrl?: string } = {};
  if (req.method === 'POST') {
    try {
      body = await req.json();
    } catch {
      body = {}; // an empty POST body is fine — returnUrl is optional
    }
  }

  const res = await handlePortalRequest(
    { method: req.method, authHeader: req.headers.get('Authorization'), body },
    deps,
  );
  return json(res.body, res.status);
});
