import { expect, type Page, test } from '@playwright/test';

/**
 * Exercises the WordPress-articles UI end-to-end in the browser. The wp-articles edge
 * function isn't deployed in this environment, so we intercept the functions.invoke call
 * (POST .../functions/v1/wp-articles) and serve canned responses — proving the app wiring:
 * list → render on home, tap → detail, and the paid (full body) vs locked (members-only)
 * branches. The function's own gating + live WordPress pull are verified separately.
 */

const STORAGE_KEY = 'la_onb_state_v1';

const ARTICLE = {
  id: 53781,
  slug: 'move-a-single-kettlebell-summer-workout',
  title: 'A Single-Kettlebell Summer Workout',
  excerpt: 'Summer has a way of making the gym feel like the wrong answer.',
  image: 'https://lentinealexis.com/wp-content/uploads/2026/06/IMG_5233-scaled.jpg',
  category: 'MOVE',
  date: '2026-06-18T18:58:41',
  link: 'https://lentinealexis.com/move-a-single-kettlebell-summer-workout',
};

function completedState(over: Record<string, unknown> = {}) {
  return JSON.stringify({
    mode: 'migrating',
    email: 'member@example.com',
    firstName: 'Maya',
    lastName: 'Rao',
    userId: null,
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
  await page.addInitScript(([k, v]) => window.localStorage.setItem(k, v), [STORAGE_KEY, json] as const);
}

/** Intercept the edge-function invoke and serve list + article (locked toggles the body). */
async function mockArticles(page: Page, { locked }: { locked: boolean }) {
  await page.route('**/functions/v1/wp-articles', async (route) => {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 200, headers: cors, body: 'ok' });
    }
    const body = JSON.parse(route.request().postData() || '{}');
    if (body.action === 'list') {
      return route.fulfill({ status: 200, headers: cors, body: JSON.stringify({ articles: [ARTICLE] }) });
    }
    // article
    const article = locked
      ? { ...ARTICLE, locked: true, contentHtml: null }
      : { ...ARTICLE, locked: false, contentHtml: '<p>Strength is a summer practice.</p><h3>The flow</h3><p>Five rounds, easy.</p>' };
    return route.fulfill({ status: 200, headers: cors, body: JSON.stringify({ article }) });
  });
}

test('home lists WordPress articles and a paid member reads the full body', async ({ page }) => {
  await seed(page, completedState());
  await mockArticles(page, { locked: false });
  await page.goto('/home');

  await expect(page.getByText('Latest from Lentine')).toBeVisible();
  await expect(page.getByText(ARTICLE.title)).toBeVisible();
  await expect(page.getByText('MOVE').first()).toBeVisible();

  await page.getByRole('button', { name: ARTICLE.title }).click();
  await expect(page).toHaveURL(/\/articles\//);
  await expect(page.getByText('Strength is a summer practice', { exact: false })).toBeVisible();
});

test('a non-member sees the members-only state on the article', async ({ page }) => {
  await seed(page, completedState({ subscription: null, tier: null, interval: null }));
  await mockArticles(page, { locked: true });
  await page.goto('/articles/move-a-single-kettlebell-summer-workout');

  await expect(page.getByText('Members only')).toBeVisible();
  await expect(page.getByText(ARTICLE.excerpt, { exact: false })).toBeVisible();
  await expect(page.getByText('Strength is a summer practice', { exact: false })).toHaveCount(0);
});
