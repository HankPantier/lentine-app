import { expect, type Page, test } from '@playwright/test';
import { seedSession } from './helpers';

/**
 * Session-truth reconciliation: persisted onboarding state can outlive the Supabase session
 * (sign-out elsewhere, expired token, leftover dev storage). Hydration must reconcile
 * persisted auth against the REAL session, so a stale browser is treated as signed out —
 * splash instead of the member dashboard, and every "Sign in" CTA back in reach — while
 * the member's dosha/quiz data survives.
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

/** A member who completed onboarding long ago — but whose session is gone. */
function staleState(over: Record<string, unknown> = {}) {
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
    tier: null,
    interval: null,
    subscription: { tier: 'recipe', interval: 'month', status: 'active', currentPeriodEnd: '2027-02-02T00:00:00.000Z' },
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

test('stale completed state with no session lands on the splash, not home', async ({ page }) => {
  await seed(page, staleState()); // note: NO supabase session seeded
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'Begin your journey' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Already a member? Sign in' })).toBeVisible();
  await expect(page).not.toHaveURL(/\/home/);
});

test('stale state deep-entering /home gets the sign-in CTA back and keeps quiz data', async ({ page }) => {
  await seed(page, staleState());
  await mockArticles(page);
  await page.goto('/home');

  // Auth fields were cleared (subscription gone -> join panel with sign-in rescue)…
  await expect(page.getByText('No active subscription.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Already a member? Sign in' })).toBeVisible();
  // …but the dosha teaser still renders: quiz data survived the reconciliation.
  await expect(page.getByText('day begins')).toBeVisible();
});

test('a live session still resumes straight to home', async ({ page }) => {
  await seed(page, staleState());
  await seedSession(page); // same userId, but with a real (fake) session present
  await mockArticles(page);
  await page.goto('/');

  await expect(page).toHaveURL(/\/home/, { timeout: 15000 });
  await expect(page.getByText('Your membership')).toBeVisible();
});

test('stale state sees the sign-in rescue on a locked article', async ({ page }) => {
  await seed(page, staleState());
  await mockArticles(page);
  await page.goto('/home');
  await page.getByRole('button', { name: RECIPE.title }).click();

  await expect(page.getByText('Members only')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Already a member? Sign in' })).toBeVisible();
});
