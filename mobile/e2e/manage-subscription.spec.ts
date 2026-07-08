import { expect, type Page, test } from '@playwright/test';

/**
 * Manage-subscription flow on the account screen. The Stripe Customer Portal itself is
 * Stripe-hosted — these tests verify the app's side of the seam: the create-portal-session
 * call, opening the returned URL, the web fallback when billing isn't manageable, and the
 * cancel-pending rendering (including the focus refetch that picks up portal changes).
 */

const STORAGE_KEY = 'la_onb_state_v1';
const SB_SESSION_KEY = 'sb-cnarqxhknjtqaovmzsco-auth-token';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

function fakeSession() {
  return JSON.stringify({
    access_token: 'fake-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: 9999999999,
    refresh_token: 'fake-refresh-token',
    user: { id: 'u_1', email: 'member@example.com', aud: 'authenticated', role: 'authenticated' },
  });
}

function memberState(subscription: Record<string, unknown>) {
  return JSON.stringify({
    mode: 'migrating',
    email: 'member@example.com',
    password: '',
    firstName: 'Maya',
    lastName: 'Rao',
    userId: 'u_1',
    dosha: 'pitta',
    doshaScores: { vata: 3, pitta: 6, kapha: 3 },
    doshaTakenAt: '2026-06-01T00:00:00.000Z',
    tier: 'recipe',
    interval: 'month',
    subscription,
    answers: Array(12).fill(null),
    quizDone: true,
    completed: true,
    quizNudgeDismissedAt: null,
  });
}

const ACTIVE_SUB = {
  tier: 'recipe',
  interval: 'month',
  status: 'active',
  currentPeriodEnd: '2027-02-02T00:00:00.000Z',
  cancelAtPeriodEnd: false,
};

async function seed(page: Page, subscription: Record<string, unknown> = ACTIVE_SUB) {
  await page.addInitScript(
    ([k, v, sk, sv]) => {
      window.localStorage.setItem(k, v);
      window.localStorage.setItem(sk, sv);
    },
    [STORAGE_KEY, memberState(subscription), SB_SESSION_KEY, fakeSession()] as const,
  );
}

/** Mock the create-portal-session edge function. */
async function mockPortalSession(page: Page, body: Record<string, unknown>) {
  await page.route('**/functions/v1/create-portal-session', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 200, headers: CORS, body: 'ok' });
    }
    return route.fulfill({ status: 200, headers: CORS, body: JSON.stringify(body) });
  });
}

test('manage subscription opens the Stripe portal', async ({ page }) => {
  await seed(page);
  await mockPortalSession(page, { url: 'https://billing.stripe.com/p/session/test_123' });
  // The portal URL is Stripe-hosted — stub it so the popup doesn't hit the real host.
  await page.route('https://billing.stripe.com/**', (route) =>
    route.fulfill({ status: 200, headers: { 'Content-Type': 'text/html' }, body: '<html>portal</html>' }),
  );

  await page.goto('/account');
  const popupPromise = page.waitForEvent('popup');
  await page.getByText('Manage subscription', { exact: true }).click();
  const popup = await popupPromise;
  expect(popup.url()).toContain('billing.stripe.com');
});

test('falls back to the website when billing is not manageable via Stripe', async ({ page }) => {
  await seed(page);
  await mockPortalSession(page, { manageable: false, reason: 'no_stripe_customer' });

  await page.goto('/account');
  await page.getByText('Manage subscription', { exact: true }).click();
  await expect(page.getByText(/managed on lentinealexis\.com/)).toBeVisible();
  // Web build (not iOS) → the fallback link is shown.
  await expect(page.getByText('Manage on lentinealexis.com', { exact: true })).toBeVisible();
});

test('renders a pending cancellation as "Cancels <date>"', async ({ page }) => {
  await seed(page, { ...ACTIVE_SUB, cancelAtPeriodEnd: true });
  await page.goto('/account');
  await expect(page.getByText(/Cancels February \d, 2027/)).toBeVisible();
  // Still manageable — the member can un-cancel in the portal.
  await expect(page.getByText('Manage subscription', { exact: true })).toBeVisible();
});

test('refreshes the subscription when the tab regains focus (portal changes sync back)', async ({ page }) => {
  await seed(page); // renews, not cancelled
  // The focus refetch reads Supabase; return the row as the webhook would have left it
  // after a cancel-at-period-end in the portal.
  await page.route('**/rest/v1/subscriptions**', (route) =>
    route.fulfill({
      status: 200,
      headers: CORS,
      body: JSON.stringify({
        status: 'active',
        billing_interval: 'month',
        current_period_end: '2027-02-02T00:00:00.000Z',
        cancel_at_period_end: true,
        subscription_tiers: { slug: 'recipe' },
      }),
    }),
  );

  await page.goto('/account');
  await expect(page.getByText(/Renews February \d, 2027/)).toBeVisible();

  // Simulate leaving for the portal and coming back: hidden → visible drives RN-web's
  // AppState through background → active, which triggers the account screen's refetch.
  await page.evaluate(() => {
    let vs = 'hidden';
    Object.defineProperty(document, 'visibilityState', { get: () => vs, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    vs = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
  });

  await expect(page.getByText(/Cancels February \d, 2027/)).toBeVisible();
});
