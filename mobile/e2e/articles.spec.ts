import { expect, type Page, test } from '@playwright/test';

/**
 * Exercises the WordPress-articles UI end-to-end in the browser. The wp-articles edge
 * function isn't deployed in this environment, so we intercept the functions.invoke call
 * (POST .../functions/v1/wp-articles) and serve canned responses — proving the app wiring:
 * a mixed posts+recipes list → render + sort on home, lock badges by tier, tap → detail, and
 * the paid (full body) vs locked (members-only) branches. The function's own gating + live
 * WordPress pull are verified separately.
 */

const STORAGE_KEY = 'la_onb_state_v1';

// A Back-to-Forward blog post (gated to back_to_forward), a recipe (gated to either paid tier),
// and a free post (open to everyone). Dates are deliberately interleaved so sort order is testable.
const POST = {
  id: 1,
  slug: 'kettlebell',
  type: 'post' as const,
  visibility: 'paid' as const,
  title: 'A Single-Kettlebell Summer Workout',
  excerpt: 'Summer has a way of making the gym feel like the wrong answer.',
  image: null,
  category: 'MOVE',
  date: '2026-06-18T18:58:41',
  link: 'https://lentinealexis.com/kettlebell',
};
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
const FREE = {
  id: 3,
  slug: 'morning-pages',
  type: 'post' as const,
  visibility: 'free' as const,
  title: 'On Morning Pages',
  excerpt: 'A free reflection to start the day.',
  image: null,
  category: 'READ',
  date: '2026-06-10T08:00:00',
  link: 'https://lentinealexis.com/morning-pages',
};
const LIST = [RECIPE, POST, FREE];

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

function subOf(tier: 'recipe' | 'back_to_forward') {
  return { subscription: { tier, interval: 'month', status: 'active', currentPeriodEnd: '2027-02-02T00:00:00.000Z' }, tier };
}

async function seed(page: Page, json: string) {
  await page.addInitScript(([k, v]) => window.localStorage.setItem(k, v), [STORAGE_KEY, json] as const);
}

/**
 * Intercept the edge-function invoke: `list` returns the mixed feed; `article` returns the full
 * body only when the requested slug is in `unlocked` (simulating the function's tier check).
 */
async function mockArticles(page: Page, unlocked: string[]) {
  await page.route('**/functions/v1/wp-articles', async (route) => {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 200, headers: cors, body: 'ok' });
    }
    const body = JSON.parse(route.request().postData() || '{}');
    if (body.action === 'list') {
      return route.fulfill({ status: 200, headers: cors, body: JSON.stringify({ articles: LIST }) });
    }
    const summary = LIST.find((a) => a.slug === body.slug) ?? POST;
    const isUnlocked = unlocked.includes(summary.slug);
    const article = isUnlocked
      ? { ...summary, locked: false, contentHtml: '<p>Strength is a summer practice.</p><h3>The flow</h3><p>Five rounds, easy.</p>' }
      : { ...summary, locked: true, contentHtml: null };
    return route.fulfill({ status: 200, headers: cors, body: JSON.stringify({ article }) });
  });
}

/** Vertical position of a feed item's title — lets us assert sort order without DOM coupling. */
async function titleY(page: Page, title: string): Promise<number> {
  const box = await page.getByText(title, { exact: true }).first().boundingBox();
  if (!box) throw new Error(`title not found: ${title}`);
  return box.y;
}

test('home lists posts + recipes and a back_to_forward member reads the full body', async ({ page }) => {
  await seed(page, completedState());
  await mockArticles(page, [POST.slug, RECIPE.slug, FREE.slug]);
  await page.goto('/home');

  await expect(page.getByText('Latest from Lentine')).toBeVisible();
  await expect(page.getByText(POST.title, { exact: true })).toBeVisible();
  await expect(page.getByText(RECIPE.title, { exact: true })).toBeVisible();
  await expect(page.getByText(FREE.title, { exact: true })).toBeVisible();
  // Everything is unlocked for this tier → no lock badges.
  await expect(page.getByText('Members', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: POST.title }).click();
  await expect(page).toHaveURL(/\/articles\//);
  await expect(page.getByText('Strength is a summer practice', { exact: false })).toBeVisible();
});

test('the feed re-sorts in-app between Recent and Type', async ({ page }) => {
  await seed(page, completedState());
  await mockArticles(page, []);
  await page.goto('/home');

  // Default "Recent": newest first → recipe (06-20) sits above the post (06-18).
  expect(await titleY(page, RECIPE.title)).toBeLessThan(await titleY(page, POST.title));

  // "Type" groups posts before recipes → the post now sits above the recipe.
  await page.getByRole('button', { name: 'Sort by Type' }).click();
  expect(await titleY(page, POST.title)).toBeLessThan(await titleY(page, RECIPE.title));
});

test('lock badges follow the tier: recipe member sees the B2F post locked, recipe + free open', async ({ page }) => {
  await seed(page, completedState(subOf('recipe')));
  await mockArticles(page, [RECIPE.slug, FREE.slug]);
  await page.goto('/home');

  // Only the back_to_forward post is gated for a recipe-tier member → exactly one badge.
  await expect(page.getByText('Members', { exact: true })).toHaveCount(1);

  // The recipe opens to its full body for a recipe-tier member.
  await page.getByRole('button', { name: RECIPE.title }).click();
  await expect(page).toHaveURL(/\/articles\//);
  await expect(page.getByText('Strength is a summer practice', { exact: false })).toBeVisible();
});

test('a non-member sees both paid items locked but the free post open', async ({ page }) => {
  await seed(page, completedState({ subscription: null, tier: null, interval: null }));
  await mockArticles(page, [FREE.slug]);
  await page.goto('/home');

  await expect(page.getByText('Members', { exact: true })).toHaveCount(2);

  // The paid post shows the members-only state (no body), with the membership paths
  // (sign-in rescue for the signed-out, in-app membership for everyone).
  await page.getByRole('button', { name: POST.title }).click();
  await expect(page.getByText('Members only')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Already a member? Sign in' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Explore membership' })).toBeVisible();
  await expect(page.getByText('Strength is a summer practice', { exact: false })).toHaveCount(0);
});
