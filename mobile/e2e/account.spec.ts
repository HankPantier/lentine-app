import { expect, type Page, test } from '@playwright/test';

/**
 * Account-screen management actions. We seed the persisted onboarding state (see onboarding.spec.ts
 * for the rationale) to land on /account signed-in, and intercept the Supabase auth endpoint so the
 * email-change wiring is verified without mutating a real user.
 */

const STORAGE_KEY = 'la_onb_state_v1';
const SB_SESSION_KEY = 'sb-cnarqxhknjtqaovmzsco-auth-token';

/** A far-future supabase-js session so auth.updateUser attaches a token and hits the network. */
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

function completedState(over: Record<string, unknown> = {}) {
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
    tier: 'back_to_forward',
    interval: 'month',
    subscription: { tier: 'back_to_forward', interval: 'month', status: 'active', currentPeriodEnd: '2027-02-02T00:00:00.000Z' },
    answers: Array(12).fill(null),
    quizDone: true,
    completed: true,
    quizNudgeDismissedAt: null,
    ...over,
  });
}

async function seed(page: Page, json: string) {
  await page.addInitScript(
    ([k, v, sk, sv]) => {
      window.localStorage.setItem(k, v);
      window.localStorage.setItem(sk, sv);
    },
    [STORAGE_KEY, json, SB_SESSION_KEY, fakeSession()] as const,
  );
}

/** Intercept Supabase auth updateUser (PUT /auth/v1/user); ok=true → success, else an error body. */
async function mockUpdateUser(page: Page, ok: boolean) {
  await page.route('**/auth/v1/user**', async (route) => {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
    const method = route.request().method();
    if (method === 'OPTIONS') return route.fulfill({ status: 200, headers: cors, body: 'ok' });
    const user = { id: 'u_1', email: 'member@example.com', aud: 'authenticated', role: 'authenticated' };
    if (method === 'GET') return route.fulfill({ status: 200, headers: cors, body: JSON.stringify(user) });
    // PUT (updateUser)
    if (ok) {
      return route.fulfill({ status: 200, headers: cors, body: JSON.stringify({ ...user, new_email: 'new@example.com' }) });
    }
    return route.fulfill({
      status: 422,
      headers: cors,
      body: JSON.stringify({ code: 'email_exists', msg: 'Email address already in use', error_code: 'email_exists' }),
    });
  });
}

test('member updates their email and sees the confirmation notice', async ({ page }) => {
  await seed(page, completedState());
  await mockUpdateUser(page, true);
  await page.goto('/account');

  await expect(page.getByText('Email changes are coming soon')).toHaveCount(0); // stub is gone
  const field = page.getByPlaceholder('you@example.com');
  await field.fill('new@example.com');
  await page.getByRole('button', { name: 'Update email' }).click();

  await expect(page.getByText('Check your new inbox to confirm the change.')).toBeVisible();
});

test('email update surfaces the auth error', async ({ page }) => {
  await seed(page, completedState());
  await mockUpdateUser(page, false);
  await page.goto('/account');

  await page.getByPlaceholder('you@example.com').fill('taken@example.com');
  await page.getByRole('button', { name: 'Update email' }).click();

  await expect(page.getByText('Email address already in use')).toBeVisible();
});

test('cannot submit the unchanged email', async ({ page }) => {
  await seed(page, completedState());
  await page.goto('/account');

  // Field starts pre-filled with the current email → the button is disabled.
  await expect(page.getByRole('button', { name: 'Update email' })).toBeDisabled();
});

test('notification toggles persist to the profile row', async ({ page }) => {
  // Seed with prefs already set so the checkboxes hydrate from state deterministically.
  await seed(page, completedState({ notificationPrefs: { rituals: true, recipes: true, btf: true } }));

  // Capture the PATCH body the toggle sends to Supabase (profiles update).
  let patched: unknown = null;
  await page.route('**/rest/v1/profiles**', async (route) => {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: cors, body: 'ok' });
    if (req.method() === 'PATCH') {
      patched = JSON.parse(req.postData() || '{}');
      return route.fulfill({ status: 200, headers: cors, body: JSON.stringify([{}]) });
    }
    return route.fulfill({ status: 200, headers: cors, body: JSON.stringify([]) });
  });

  await page.goto('/account');
  // Uncheck "Daily rituals".
  await page.getByRole('checkbox', { name: 'Daily rituals' }).click();
  await expect(page.getByText('Saved.')).toBeVisible();

  expect(patched).toMatchObject({ notification_prefs: { rituals: false, recipes: true, btf: true } });
});
