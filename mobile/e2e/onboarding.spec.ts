import { expect, type Page, test } from '@playwright/test';

/**
 * These specs cover the member surfaces this change introduced — the dosha-personalized
 * dashboard (home) and the /today content landing.
 *
 * Rather than drive the full signup → 12-question quiz happy path (which would create a
 * throwaway Supabase auth user on every run), we seed the persisted onboarding state the
 * web app reads from localStorage (`la_onb_state_v1`, AsyncStorage's web shim) and land on
 * the surfaces directly. This makes the rendering assertions deterministic and backend-free.
 * The signup→quiz→capture path is verified against staging manually (see the plan).
 */

const STORAGE_KEY = 'la_onb_state_v1';

function completedState(over: Record<string, unknown> = {}) {
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
    tier: 'back_to_forward',
    interval: 'month',
    subscription: {
      tier: 'back_to_forward',
      interval: 'month',
      status: 'active',
      currentPeriodEnd: '2027-02-02T00:00:00.000Z',
    },
    answers: Array(12).fill(null),
    quizDone: true,
    completed: true,
    quizNudgeDismissedAt: null,
    ...over,
  });
}

async function seed(page: Page, json: string) {
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [STORAGE_KEY, json] as const,
  );
}

/**
 * Mock the wp-articles edge function's `today` action so /today's recipe feed is deterministic and
 * backend-free. `withRecipe` false → empty feed (the "More coming soon" fallback shows).
 */
async function mockToday(page: Page, withRecipe: boolean) {
  const recipe = {
    id: 900,
    slug: 'pitta-cooling-bowl',
    type: 'recipe',
    visibility: 'paid',
    title: 'Pitta Cooling Bowl',
    excerpt: 'A cooling summer bowl.',
    image: null,
    category: 'Salads',
    date: '2026-06-20T10:00:00',
    link: 'https://lentinealexis.com/recipe/pitta-cooling-bowl',
  };
  await page.route('**/functions/v1/wp-articles', async (route) => {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 200, headers: cors, body: 'ok' });
    const body = JSON.parse(route.request().postData() || '{}');
    if (body.action === 'today') {
      return route.fulfill({
        status: 200,
        headers: cors,
        body: JSON.stringify({ articles: withRecipe ? [recipe] : [] }),
      });
    }
    return route.fulfill({ status: 200, headers: cors, body: JSON.stringify({ articles: [] }) });
  });
}

test('dashboard shows the member greeting, dosha day, and real subscription', async ({ page }) => {
  await seed(page, completedState());
  await page.goto('/home');

  await expect(page.getByText('Maya', { exact: false })).toBeVisible();
  await expect(page.getByText('day begins')).toBeVisible();
  await expect(page.getByText('Today, for your Pitta')).toBeVisible();
  await expect(page.getByText('Back to Forward')).toBeVisible();
  await expect(page.getByText('Active', { exact: false })).toBeVisible();
});

test('the home teaser navigates to the /today landing', async ({ page }) => {
  await seed(page, completedState());
  await mockToday(page, true);
  await page.goto('/home');

  await page.getByText('See today').click();

  await expect(page).toHaveURL(/\/today/);
  // Expo Router keeps the prior screen mounted in the web DOM, so match the hero exactly to
  // avoid colliding with the home teaser ("Today, for your Pitta") / "Made for your Pitta".
  await expect(page.getByText('For your Pitta', { exact: true })).toBeVisible();
});

test('/today renders dosha-personalized content + the real recipe feed', async ({ page }) => {
  // Load /today directly so home isn't mounted and every content string is unambiguous.
  await seed(page, completedState());
  await mockToday(page, true);
  await page.goto('/today');

  await expect(page.getByText('Cool the fire', { exact: false })).toBeVisible();
  await expect(page.getByText('Cooling breath by a window')).toBeVisible();
  await expect(page.getByText('Ginger lentil soup')).toHaveCount(0); // kapha content, not pitta
  // The dosha-matched recipe feed renders (no longer a static "coming soon" placeholder).
  await expect(page.getByText('Pitta Cooling Bowl')).toBeVisible();
  await expect(page.getByText('More coming soon')).toHaveCount(0);
});

test('/today falls back to the coming-soon note when no recipes match', async ({ page }) => {
  await seed(page, completedState());
  await mockToday(page, false);
  await page.goto('/today');

  await expect(page.getByText('More coming soon')).toBeVisible();
});

test('member can edit dosha answers from the account screen', async ({ page }) => {
  // Stale primary (vata) but every answer is kapha — proves the edit screen recomputes the
  // result from the answers (not the stored primary) and saves the new one.
  await seed(page, completedState({ dosha: 'vata', answers: Array(12).fill('kapha') }));
  await page.goto('/account');

  await page.getByRole('button', { name: 'Edit my answers' }).click();
  await expect(page).toHaveURL(/\/edit-answers/);
  await expect(page.getByText('Edit your', { exact: false })).toBeVisible();
  await expect(page.getByText('Kapha')).toBeVisible(); // live recomputed preview

  await page.getByRole('button', { name: 'Save answers' }).click();
  await expect(page).toHaveURL(/\/account/);
  await expect(page.getByText('Kapha')).toBeVisible(); // saved + reflected on the profile
});

test('/today invites un-quizzed members to take the quiz', async ({ page }) => {
  await seed(page, completedState({ dosha: null, doshaScores: null, doshaTakenAt: null, quizDone: false }));
  await page.goto('/today');

  await expect(page.getByText('Find your')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Take the quiz' })).toBeVisible();
});
