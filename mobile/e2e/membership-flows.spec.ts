import { expect, type Page, test } from '@playwright/test';
import { seedSession } from './helpers';

/**
 * UX-audit M4: the membership paths. A locked article offers sign-in + in-app membership
 * (previously one dead-end "open on the website" link), /membership stands alone AND serves
 * as the informational onboarding step (the mock payment chain is gone), signup's
 * email-confirmation limbo has resend/continue, and the notifications step no longer
 * overwrites a returning member's saved prefs.
 */

const STORAGE_KEY = 'la_onb_state_v1';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

const RECIPE = {
  id: 2,
  slug: 'golden-kitchari',
  type: 'recipe' as const,
  visibility: 'paid' as const,
  title: 'Golden Kitchari',
  excerpt: 'A warming, grounding bowl for any season.',
  image: null,
  category: 'NOURISH',
  date: '2026-06-20T10:00:00',
  link: 'https://lentinealexis.com/recipe/golden-kitchari',
};

function baseState(over: Record<string, unknown> = {}) {
  return JSON.stringify({
    mode: 'migrating',
    email: 'member@example.com',
    password: '',
    firstName: 'Maya',
    lastName: 'Rao',
    userId: null,
    dosha: 'pitta',
    doshaScores: { vata: 3, pitta: 6, kapha: 3 },
    doshaTakenAt: '2026-06-01T00:00:00.000Z',
    tier: null,
    interval: null,
    subscription: null,
    answers: Array(12).fill(null),
    quizDone: true,
    completed: true,
    quizNudgeDismissedAt: null,
    notificationPrefs: null,
    ...over,
  });
}

async function seed(page: Page, json: string) {
  await page.addInitScript(([k, v]) => window.localStorage.setItem(k, v), [STORAGE_KEY, json] as const);
}

async function mockArticles(page: Page) {
  await page.route('**/functions/v1/wp-articles', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 200, headers: CORS, body: 'ok' });
    const body = JSON.parse(route.request().postData() || '{}');
    if (body.action === 'list') {
      return route.fulfill({ status: 200, headers: CORS, body: JSON.stringify({ articles: [RECIPE] }) });
    }
    return route.fulfill({
      status: 200,
      headers: CORS,
      body: JSON.stringify({ article: { ...RECIPE, locked: true, contentHtml: null } }),
    });
  });
}

test('a signed-out reader is offered sign-in + in-app membership on locked content', async ({ page }) => {
  await seed(page, baseState());
  await mockArticles(page);
  await page.goto('/home');
  await page.getByRole('button', { name: RECIPE.title }).click();

  await expect(page.getByText('Members only')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open on the website' })).toHaveCount(0);

  // Sign-in rescue lands on the returning-member sign-in.
  await page.getByRole('button', { name: 'Already a member? Sign in' }).click();
  await expect(page).toHaveURL(/\/signup/);
  await expect(page.getByText('Welcome back')).toBeVisible();
});

test('the membership page shows both plans and the pre-Stripe join note', async ({ page }) => {
  await seed(page, baseState());
  await page.goto('/membership');

  await expect(page.getByText('Recipe Club', { exact: true })).toBeVisible();
  await expect(page.getByText('Back to Forward', { exact: true })).toBeVisible();
  await expect(page.getByText('In-app membership is coming soon', { exact: false })).toBeVisible();
  // No card inputs anywhere near this flow anymore.
  await expect(page.getByPlaceholder('1234 5678 9012 3456')).toHaveCount(0);
});

test('a subscribed member sees their plan instead of the join panel', async ({ page }) => {
  await seed(
    page,
    baseState({
      userId: 'u_1',
      subscription: { tier: 'recipe', interval: 'year', status: 'active', currentPeriodEnd: '2027-02-02T00:00:00.000Z' },
    }),
  );
  await seedSession(page); // a seeded userId needs a live session or hydration clears it
  await page.goto('/membership');

  await expect(page.getByText('Active plan')).toBeVisible();
  await expect(page.getByText('Ready to join?')).toHaveCount(0);
  await expect(page.getByText('Plan changes and cancellation are coming soon.')).toBeVisible();
});

test('new-user onboarding: membership is an informational step that continues to notifications', async ({ page }) => {
  await seed(page, baseState({ mode: 'new', completed: false, userId: 'u_1' }));
  await seedSession(page);
  await page.goto('/membership');

  await expect(page.getByText('Recipe Club', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/notifications/);
});

test('signup email-confirmation limbo offers resend and continue (no more dead end)', async ({ page }) => {
  await seed(page, baseState({ mode: 'new', completed: false, email: '', password: '' }));
  let resent = 0;
  await page.route('**/auth/v1/signup**', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 200, headers: CORS, body: 'ok' });
    return route.fulfill({
      status: 200,
      headers: CORS,
      // Confirmation ON: user created but no session.
      body: JSON.stringify({ id: 'u_new', email: 'new@example.com', aud: 'authenticated', role: '' }),
    });
  });
  await page.route('**/auth/v1/resend**', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 200, headers: CORS, body: 'ok' });
    resent += 1;
    return route.fulfill({ status: 200, headers: CORS, body: JSON.stringify({}) });
  });

  await page.goto('/signup');
  const inputs = page.locator('input:visible');
  await inputs.nth(0).fill('new@example.com');
  await inputs.nth(1).fill('secret123');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  await expect(page.getByText('Account created!', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'I’ve confirmed — continue' })).toBeVisible();

  await page.getByRole('button', { name: 'Resend email' }).click();
  await expect(page.getByText('re-sent', { exact: false })).toBeVisible();
  expect(resent).toBe(1);
  // Cooldown: the resend button is now disabled ("Email sent").
  await expect(page.getByRole('button', { name: 'Email sent' })).toBeDisabled();
});

test('"Maybe later" on notifications never overwrites saved prefs', async ({ page }) => {
  // A returning member mid-onboarding whose prefs were hydrated at sign-in.
  await seed(
    page,
    baseState({
      mode: 'migrating',
      completed: false,
      userId: 'u_1',
      notificationPrefs: { rituals: true, recipes: true, btf: false },
    }),
  );
  await seedSession(page);
  let patches = 0;
  await page.route('**/rest/v1/profiles**', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 200, headers: CORS, body: 'ok' });
    if (route.request().method() === 'PATCH') patches += 1;
    return route.fulfill({ status: 204, headers: CORS, body: '' });
  });

  await page.goto('/notifications');
  await page.getByRole('button', { name: 'Maybe later' }).click();
  await expect(page).toHaveURL(/\/home/);
  expect(patches).toBe(0);
});
