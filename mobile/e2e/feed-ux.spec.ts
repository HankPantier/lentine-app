import { expect, type Page, test } from '@playwright/test';

/**
 * Perceived-performance and failure-state behavior added by the UX-audit M1 work:
 *  - the reader paints the tapped card's header instantly (preview store) while the body loads
 *  - the content cache serves repeat visits without refetching
 *  - a failed feed load shows a retry state instead of an eternal spinner or fake-empty copy
 */

const STORAGE_KEY = 'la_onb_state_v1';

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
const BODY_HTML = '<p>Warm the ghee gently.</p>';

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
    tier: 'recipe',
    interval: 'month',
    subscription: { tier: 'recipe', interval: 'month', status: 'active', currentPeriodEnd: '2027-02-02T00:00:00.000Z' },
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

const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

test('the reader shows title and excerpt instantly while a slow body request resolves', async ({ page }) => {
  await seed(page, completedState());
  let releaseArticle: () => void = () => {};
  const articleGate = new Promise<void>((r) => {
    releaseArticle = r;
  });

  await page.route('**/functions/v1/wp-articles', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 200, headers: CORS, body: 'ok' });
    const body = JSON.parse(route.request().postData() || '{}');
    if (body.action === 'list') {
      return route.fulfill({ status: 200, headers: CORS, body: JSON.stringify({ articles: [RECIPE] }) });
    }
    await articleGate; // hold the article response until the test releases it
    return route.fulfill({
      status: 200,
      headers: CORS,
      body: JSON.stringify({ article: { ...RECIPE, locked: false, contentHtml: BODY_HTML } }),
    });
  });

  await page.goto('/home');
  await page.getByRole('button', { name: RECIPE.title }).click();

  // Instant paint: header content is visible while the article request is still pending.
  // (.last() — the home card behind the reader also carries the title/excerpt text.)
  await expect(page.getByText(RECIPE.title, { exact: true }).last()).toBeVisible();
  await expect(page.getByText(RECIPE.excerpt, { exact: false }).last()).toBeVisible();
  await expect(page.getByText('Warm the ghee gently', { exact: false })).toHaveCount(0);

  releaseArticle();
  await expect(page.getByText('Warm the ghee gently', { exact: false })).toBeVisible();
});

test('a locked prediction shows the members-only panel before the response lands', async ({ page }) => {
  // No subscription → the client predicts "locked" for the paid recipe instantly.
  await seed(page, completedState({ subscription: null, tier: null, interval: null }));
  await page.route('**/functions/v1/wp-articles', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 200, headers: CORS, body: 'ok' });
    const body = JSON.parse(route.request().postData() || '{}');
    if (body.action === 'list') {
      return route.fulfill({ status: 200, headers: CORS, body: JSON.stringify({ articles: [RECIPE] }) });
    }
    await new Promise((r) => setTimeout(r, 1500));
    return route.fulfill({
      status: 200,
      headers: CORS,
      body: JSON.stringify({ article: { ...RECIPE, locked: true, contentHtml: null } }),
    });
  });

  await page.goto('/home');
  await page.getByRole('button', { name: RECIPE.title }).click();
  // Well under the mocked 1.5s response delay:
  await expect(page.getByText('Members only')).toBeVisible({ timeout: 1200 });
});

test('the feed is fetched once across home → article → back', async ({ page }) => {
  await seed(page, completedState());
  let listCalls = 0;
  await page.route('**/functions/v1/wp-articles', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 200, headers: CORS, body: 'ok' });
    const body = JSON.parse(route.request().postData() || '{}');
    if (body.action === 'list') {
      listCalls += 1;
      return route.fulfill({ status: 200, headers: CORS, body: JSON.stringify({ articles: [RECIPE] }) });
    }
    return route.fulfill({
      status: 200,
      headers: CORS,
      body: JSON.stringify({ article: { ...RECIPE, locked: false, contentHtml: BODY_HTML } }),
    });
  });

  await page.goto('/home');
  await page.getByRole('button', { name: RECIPE.title }).click();
  await expect(page.getByText('Warm the ghee gently', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Go back' }).click();
  await expect(page.getByText('Latest from Lentine')).toBeVisible();
  await expect(page.getByText(RECIPE.title, { exact: true })).toBeVisible();
  expect(listCalls).toBe(1);
});

test('a failed feed load shows a retry state, and retrying recovers', async ({ page }) => {
  await seed(page, completedState());
  let attempt = 0;
  await page.route('**/functions/v1/wp-articles', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 200, headers: CORS, body: 'ok' });
    const body = JSON.parse(route.request().postData() || '{}');
    if (body.action === 'list') {
      attempt += 1;
      if (attempt === 1) return route.fulfill({ status: 500, headers: CORS, body: JSON.stringify({ error: 'down' }) });
      return route.fulfill({ status: 200, headers: CORS, body: JSON.stringify({ articles: [RECIPE] }) });
    }
    return route.fulfill({ status: 200, headers: CORS, body: JSON.stringify({ article: null }) });
  });

  await page.goto('/home');
  await expect(page.getByText('Couldn’t load articles right now.')).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText(RECIPE.title, { exact: true })).toBeVisible();
  await expect(page.getByText('Couldn’t load articles right now.')).toHaveCount(0);
});

test('a failed article load shows a retry state, and retrying recovers', async ({ page }) => {
  await seed(page, completedState());
  let articleCalls = 0;
  await page.route('**/functions/v1/wp-articles', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 200, headers: CORS, body: 'ok' });
    const body = JSON.parse(route.request().postData() || '{}');
    if (body.action === 'list') {
      return route.fulfill({ status: 200, headers: CORS, body: JSON.stringify({ articles: [RECIPE] }) });
    }
    articleCalls += 1;
    if (articleCalls === 1) {
      return route.fulfill({ status: 500, headers: CORS, body: JSON.stringify({ error: 'origin timeout' }) });
    }
    return route.fulfill({
      status: 200,
      headers: CORS,
      body: JSON.stringify({ article: { ...RECIPE, locked: false, contentHtml: BODY_HTML } }),
    });
  });

  await page.goto('/home');
  await page.getByRole('button', { name: RECIPE.title }).click();

  // First attempt fails -> the reader offers a retry, not a dead end.
  await expect(page.getByText('Article unavailable')).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('Warm the ghee gently', { exact: false })).toBeVisible();
});
