// deno test — handler tests with injected deps (no real Stripe/Supabase).
// Run: deno test supabase/functions/create-portal-session/

import { assertEquals } from 'jsr:@std/assert@1';
import { handlePortalRequest, type PortalDeps } from './handler.ts';

const ENV = {
  PORTAL_RETURN_URL: 'https://staging.example.com/app',
  PORTAL_RETURN_ORIGINS: 'http://localhost:8081,https://staging.example.com',
};

function fakeDeps(overrides: Partial<PortalDeps> = {}) {
  const created: Array<{ customer: string; returnUrl: string }> = [];
  const deps: PortalDeps = {
    getUser: (token) => Promise.resolve(token === 'good-token' ? { id: 'user-1' } : null),
    getSubscriptionRow: () =>
      Promise.resolve({ stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1', status: 'active' }),
    createPortalSession: (customer, returnUrl) => {
      created.push({ customer, returnUrl });
      return Promise.resolve({ url: 'https://billing.stripe.com/session/xyz' });
    },
    env: ENV,
    ...overrides,
  };
  return { deps, created };
}

function request(overrides: { method?: string; authHeader?: string | null; returnUrl?: string } = {}) {
  return {
    method: overrides.method ?? 'POST',
    authHeader: 'authHeader' in overrides ? (overrides.authHeader ?? null) : 'Bearer good-token',
    body: { returnUrl: overrides.returnUrl },
  };
}

Deno.test('rejects non-POST', async () => {
  const { deps } = fakeDeps();
  const res = await handlePortalRequest(request({ method: 'GET' }), deps);
  assertEquals(res.status, 405);
});

Deno.test('401 without a token', async () => {
  const { deps } = fakeDeps();
  const res = await handlePortalRequest(request({ authHeader: null }), deps);
  assertEquals(res.status, 401);
});

Deno.test('401 on an invalid token', async () => {
  const { deps } = fakeDeps();
  const res = await handlePortalRequest(request({ authHeader: 'Bearer bad-token' }), deps);
  assertEquals(res.status, 401);
});

Deno.test('manageable:false when the user has no subscriptions row', async () => {
  const { deps } = fakeDeps({ getSubscriptionRow: () => Promise.resolve(null) });
  const res = await handlePortalRequest(request(), deps);
  assertEquals(res.status, 200);
  assertEquals(res.body, { manageable: false, reason: 'no_subscription' });
});

Deno.test('manageable:false when stripe_customer_id is NULL (pre-cut-over subscriber)', async () => {
  const { deps } = fakeDeps({
    getSubscriptionRow: () =>
      Promise.resolve({ stripe_customer_id: null, stripe_subscription_id: null, status: 'active' }),
  });
  const res = await handlePortalRequest(request(), deps);
  assertEquals(res.status, 200);
  assertEquals(res.body, { manageable: false, reason: 'no_stripe_customer' });
});

Deno.test('manageable:false when Stripe does not know the customer (resource_missing)', async () => {
  const { deps } = fakeDeps({
    createPortalSession: () => Promise.reject(Object.assign(new Error('No such customer'), { code: 'resource_missing' })),
  });
  const res = await handlePortalRequest(request(), deps);
  assertEquals(res.status, 200);
  assertEquals(res.body, { manageable: false, reason: 'not_in_stripe' });
});

Deno.test('manageable:false on any other Stripe error', async () => {
  const { deps } = fakeDeps({
    createPortalSession: () => Promise.reject(new Error('rate limited')),
  });
  const res = await handlePortalRequest(request(), deps);
  assertEquals(res.status, 200);
  assertEquals(res.body, { manageable: false, reason: 'stripe_error' });
});

Deno.test('happy path returns the portal URL', async () => {
  const { deps, created } = fakeDeps();
  const res = await handlePortalRequest(request(), deps);
  assertEquals(res.status, 200);
  assertEquals(res.body, { url: 'https://billing.stripe.com/session/xyz' });
  assertEquals(created[0].customer, 'cus_1');
});

Deno.test('accepts a returnUrl whose origin is allowlisted', async () => {
  const { deps, created } = fakeDeps();
  await handlePortalRequest(request({ returnUrl: 'http://localhost:8081/account' }), deps);
  assertEquals(created[0].returnUrl, 'http://localhost:8081/account');
});

Deno.test('falls back to PORTAL_RETURN_URL for a non-allowlisted origin', async () => {
  const { deps, created } = fakeDeps();
  await handlePortalRequest(request({ returnUrl: 'https://evil.example.com/account' }), deps);
  assertEquals(created[0].returnUrl, ENV.PORTAL_RETURN_URL);
});

Deno.test('falls back to PORTAL_RETURN_URL when no returnUrl is sent (native)', async () => {
  const { deps, created } = fakeDeps();
  await handlePortalRequest(request(), deps);
  assertEquals(created[0].returnUrl, ENV.PORTAL_RETURN_URL);
});

Deno.test('falls back on a malformed returnUrl', async () => {
  const { deps, created } = fakeDeps();
  await handlePortalRequest(request({ returnUrl: 'not a url' }), deps);
  assertEquals(created[0].returnUrl, ENV.PORTAL_RETURN_URL);
});
