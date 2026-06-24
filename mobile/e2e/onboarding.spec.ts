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
  await page.goto('/home');

  await page.getByText('See today').click();

  await expect(page).toHaveURL(/\/today/);
  // Expo Router keeps the prior screen mounted in the web DOM, so match the hero exactly to
  // avoid colliding with the home teaser ("Today, for your Pitta") / "Made for your Pitta".
  await expect(page.getByText('For your Pitta', { exact: true })).toBeVisible();
});

test('/today renders dosha-personalized content', async ({ page }) => {
  // Load /today directly so home isn't mounted and every content string is unambiguous.
  await seed(page, completedState());
  await page.goto('/today');

  await expect(page.getByText('Cool the fire', { exact: false })).toBeVisible();
  await expect(page.getByText('Cooling breath by a window')).toBeVisible();
  await expect(page.getByText('Ginger lentil soup')).toHaveCount(0); // kapha content, not pitta
  await expect(page.getByText('More coming soon')).toBeVisible();
});

test('/today invites un-quizzed members to take the quiz', async ({ page }) => {
  await seed(page, completedState({ dosha: null, doshaScores: null, doshaTakenAt: null, quizDone: false }));
  await page.goto('/today');

  await expect(page.getByText('Find your')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Take the quiz' })).toBeVisible();
});
