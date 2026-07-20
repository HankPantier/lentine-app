import { expect, type Page, test } from '@playwright/test';

/**
 * Season-aware default order on the home feed: recipes tagged with seasons that exclude the
 * current one sink below everything else; "Recent" restores pure newest-first. Fixtures are
 * built relative to the real clock (same meteorological month table as src/lib/season.ts),
 * so no Date mocking is needed.
 */

const STORAGE_KEY = 'la_onb_state_v1';

function currentSeason(): string {
  const m = new Date().getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'fall';
  return 'winter';
}
const OPPOSITE: Record<string, string> = { spring: 'fall', summer: 'winter', fall: 'spring', winter: 'summer' };
const OUT_SEASON = OPPOSITE[currentSeason()];

// The out-of-season recipe is the NEWEST item — without sinking it would lead the feed.
const OUT = {
  id: 1,
  slug: 'out-of-season-stew',
  type: 'recipe' as const,
  visibility: 'free' as const,
  title: 'A Stew for Another Season',
  excerpt: 'Best saved for colder (or warmer) days.',
  image: null,
  category: 'NOURISH',
  date: '2026-06-22T10:00:00',
  link: 'https://lentinealexis.com/recipe/out-of-season-stew',
  season: [OUT_SEASON],
  dosha: [],
};
const POST = {
  id: 2,
  slug: 'walk-notes',
  type: 'post' as const,
  visibility: 'free' as const,
  title: 'Notes from a Long Walk',
  excerpt: 'A middle-aged post.',
  image: null,
  category: 'READ',
  date: '2026-06-15T10:00:00',
  link: 'https://lentinealexis.com/walk-notes',
};
const PLAIN = {
  id: 3,
  slug: 'anytime-broth',
  type: 'recipe' as const,
  visibility: 'free' as const,
  title: 'Anytime Broth',
  excerpt: 'A seasonless staple.',
  image: null,
  category: 'NOURISH',
  date: '2026-06-10T10:00:00',
  link: 'https://lentinealexis.com/recipe/anytime-broth',
  season: [],
  dosha: [],
};
const LIST = [OUT, POST, PLAIN];

function completedState() {
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
  });
}

async function setup(page: Page) {
  await page.addInitScript(([k, v]) => window.localStorage.setItem(k, v), [STORAGE_KEY, completedState()] as const);
  await page.route('**/functions/v1/wp-articles', async (route) => {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 200, headers: cors, body: 'ok' });
    return route.fulfill({ status: 200, headers: cors, body: JSON.stringify({ articles: LIST }) });
  });
  await page.goto('/home');
  await expect(page.getByText('Latest from Lentine')).toBeVisible();
}

/** Vertical position of a feed item's title — asserts order without DOM coupling. */
async function titleY(page: Page, title: string): Promise<number> {
  const box = await page.getByText(title, { exact: true }).first().boundingBox();
  if (!box) throw new Error(`title not found: ${title}`);
  return box.y;
}

test('the newest recipe sinks below older items when tagged out of season', async ({ page }) => {
  await setup(page);
  const [out, post, plain] = await Promise.all([
    titleY(page, OUT.title),
    titleY(page, POST.title),
    titleY(page, PLAIN.title),
  ]);
  expect(post).toBeLessThan(plain); // newest-first among the undemoted
  expect(plain).toBeLessThan(out); // …and the out-of-season recipe last
});

test('its card shows the Season meta line', async ({ page }) => {
  await setup(page);
  const label = OUT_SEASON[0].toUpperCase() + OUT_SEASON.slice(1);
  await expect(page.getByText(label, { exact: true })).toBeVisible();
});

test('Recent restores pure newest-first order', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: 'Show everything, newest first' }).click();
  const [out, post, plain] = await Promise.all([
    titleY(page, OUT.title),
    titleY(page, POST.title),
    titleY(page, PLAIN.title),
  ]);
  expect(out).toBeLessThan(post);
  expect(post).toBeLessThan(plain);
});

test('type filtering preserves the seasonal order', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: 'Filter by type' }).click();
  await page.getByRole('button', { name: 'Show Recipes' }).click();
  await expect(page.getByText(POST.title, { exact: true })).toHaveCount(0);
  expect(await titleY(page, PLAIN.title)).toBeLessThan(await titleY(page, OUT.title));
});
