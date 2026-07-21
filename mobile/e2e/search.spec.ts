import { expect, type Page, test } from '@playwright/test';

/**
 * Full-catalog search on the home screen:
 *  - typing a query swaps the feed area for server search results (chips hide meanwhile)
 *  - the search hit can be an item NOT in the recent feed — that's the whole point
 *  - clearing restores the untouched feed; empty and failed searches have their own states
 *  - keystrokes are debounced into a single request; too-short queries never fire one
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
const POST = {
  id: 3,
  slug: 'morning-rituals',
  type: 'post' as const,
  visibility: 'free' as const,
  title: 'Morning Rituals',
  excerpt: 'Begin the day with intention.',
  image: null,
  category: 'RITUAL',
  date: '2026-06-18T10:00:00',
  link: 'https://lentinealexis.com/morning-rituals',
};
// Deliberately absent from the `list` mock — proves search reaches beyond the loaded feed.
const SEARCH_HIT = {
  id: 44,
  slug: 'chai-spice-blend',
  type: 'recipe' as const,
  visibility: 'free' as const,
  title: 'Chai Spice Blend',
  excerpt: 'An archive favorite from two winters ago.',
  image: null,
  category: 'NOURISH',
  date: '2024-12-01T10:00:00',
  link: 'https://lentinealexis.com/recipe/chai-spice-blend',
};

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
    tier: 'recipe',
    interval: 'month',
    subscription: { tier: 'recipe', interval: 'month', status: 'active', currentPeriodEnd: '2027-02-02T00:00:00.000Z' },
    answers: Array(12).fill(null),
    quizDone: true,
    completed: true,
    quizNudgeDismissedAt: null,
  });
}

async function seed(page: Page) {
  await page.addInitScript(
    ([k, v]) => window.localStorage.setItem(k, v),
    [STORAGE_KEY, completedState()] as const,
  );
}

const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

interface SearchMockOptions {
  /** Response per search call, by call index (last repeats). Default: one page of [SEARCH_HIT]. */
  responses?: { status: number; articles?: typeof SEARCH_HIT[] }[];
  /** Hold search responses until the returned release() is called (skeleton-state tests). */
  hold?: boolean;
}

/** Mock the edge function; returns a live view of the search calls it received. */
async function mockArticles(page: Page, opts: SearchMockOptions = {}) {
  const searchCalls: { query: string; perPage: number }[] = [];
  const responses = opts.responses ?? [{ status: 200, articles: [SEARCH_HIT] }];
  let release: () => void = () => {};
  const gate = opts.hold ? new Promise<void>((r) => (release = r)) : null;
  await page.route('**/functions/v1/wp-articles', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 200, headers: CORS, body: 'ok' });
    const body = JSON.parse(route.request().postData() || '{}');
    if (body.action === 'list') {
      return route.fulfill({ status: 200, headers: CORS, body: JSON.stringify({ articles: [RECIPE, POST] }) });
    }
    if (body.action === 'search') {
      searchCalls.push({ query: body.query, perPage: body.perPage });
      if (gate) await gate;
      const res = responses[Math.min(searchCalls.length - 1, responses.length - 1)];
      if (res.status !== 200) {
        return route.fulfill({ status: res.status, headers: CORS, body: JSON.stringify({ error: 'down' }) });
      }
      return route.fulfill({ status: 200, headers: CORS, body: JSON.stringify({ articles: res.articles ?? [] }) });
    }
    return route.fulfill({ status: 200, headers: CORS, body: JSON.stringify({ article: null }) });
  });
  return { searchCalls, release: () => release() };
}

function searchInput(page: Page) {
  return page.getByPlaceholder('Search recipes & articles');
}

test('typing a query shows full-catalog results and hides the feed and chips', async ({ page }) => {
  await seed(page);
  await mockArticles(page);
  await page.goto('/home');
  await expect(page.getByText(RECIPE.title, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show everything, newest first' })).toBeVisible();

  await searchInput(page).fill('chai');
  await expect(page.getByText('Search results')).toBeVisible();
  // The hit is NOT in the recent feed — search reaches the whole catalog.
  await expect(page.getByText(SEARCH_HIT.title, { exact: true })).toBeVisible();
  // Feed items and filter chips are out of the way while searching.
  await expect(page.getByText(RECIPE.title, { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Show everything, newest first' })).toHaveCount(0);
});

test('clearing the search restores the feed', async ({ page }) => {
  await seed(page);
  await mockArticles(page);
  await page.goto('/home');
  await searchInput(page).fill('chai');
  await expect(page.getByText(SEARCH_HIT.title, { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(page.getByText('Latest from Lentine')).toBeVisible();
  await expect(page.getByText(RECIPE.title, { exact: true })).toBeVisible();
  await expect(page.getByText(SEARCH_HIT.title, { exact: true })).toHaveCount(0);
  await expect(searchInput(page)).toHaveValue('');
});

test('no matches shows an empty state whose button clears the search', async ({ page }) => {
  await seed(page);
  await mockArticles(page, { responses: [{ status: 200, articles: [] }] });
  await page.goto('/home');
  await searchInput(page).fill('xyzzy');
  await expect(page.getByText('No matches for that search.')).toBeVisible();

  // Two "Clear search" affordances exist here (the input's ✕ and this button) — click the button.
  await page.getByText('Clear search', { exact: true }).click();
  await expect(page.getByText('Latest from Lentine')).toBeVisible();
  await expect(page.getByText(RECIPE.title, { exact: true })).toBeVisible();
});

test('a failed search shows a retry state, and retrying recovers', async ({ page }) => {
  await seed(page);
  await mockArticles(page, {
    responses: [{ status: 500 }, { status: 200, articles: [SEARCH_HIT] }],
  });
  await page.goto('/home');
  await searchInput(page).fill('chai');
  await expect(page.getByText('Couldn’t search right now.')).toBeVisible();

  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText(SEARCH_HIT.title, { exact: true })).toBeVisible();
  await expect(page.getByText('Couldn’t search right now.')).toHaveCount(0);
});

test('while searching, skeletons show and already-loaded matches paint instantly', async ({ page }) => {
  await seed(page);
  const { release } = await mockArticles(page, { hold: true });
  await page.goto('/home');
  await expect(page.getByText(RECIPE.title, { exact: true })).toBeVisible();

  // "kitchari" matches the loaded RECIPE — it must appear as an instant local result
  // (under "From the latest") while the full-catalog search is still in flight.
  await searchInput(page).fill('kitchari');
  await expect(page.getByText('Searching the whole catalog…')).toBeVisible();
  await expect(page.getByText('From the latest')).toBeVisible();
  await expect(page.getByText(RECIPE.title, { exact: true })).toBeVisible();
  await expect(page.getByText(SEARCH_HIT.title, { exact: true })).toHaveCount(0);

  release();
  await expect(page.getByText(SEARCH_HIT.title, { exact: true })).toBeVisible();
  await expect(page.getByText('Searching the whole catalog…')).toHaveCount(0);
  await expect(page.getByText('From the latest')).toHaveCount(0);
});

test('a query with no loaded matches shows only skeletons while in flight', async ({ page }) => {
  await seed(page);
  const { release } = await mockArticles(page, { hold: true });
  await page.goto('/home');
  await expect(page.getByText(RECIPE.title, { exact: true })).toBeVisible();

  await searchInput(page).fill('chai');
  await expect(page.getByText('Searching the whole catalog…')).toBeVisible();
  await expect(page.getByText('From the latest')).toHaveCount(0);

  release();
  await expect(page.getByText(SEARCH_HIT.title, { exact: true })).toBeVisible();
});

test('keystrokes are debounced into a single request for the final query', async ({ page }) => {
  await seed(page);
  const { searchCalls } = await mockArticles(page);
  await page.goto('/home');
  await expect(page.getByText(RECIPE.title, { exact: true })).toBeVisible();

  // Well under the 350ms debounce between keys — only the settled query may fire.
  await searchInput(page).pressSequentially('kitchari', { delay: 30 });
  await expect(page.getByText(SEARCH_HIT.title, { exact: true })).toBeVisible();
  expect(searchCalls).toHaveLength(1);
  expect(searchCalls[0].query).toBe('kitchari');
});

test('a one-character query never fires a request', async ({ page }) => {
  await seed(page);
  const { searchCalls } = await mockArticles(page);
  await page.goto('/home');
  await expect(page.getByText(RECIPE.title, { exact: true })).toBeVisible();

  await searchInput(page).fill('k');
  // Give the debounce window ample time to (not) fire.
  await page.waitForTimeout(800);
  expect(searchCalls).toHaveLength(0);
  // Still in feed mode.
  await expect(page.getByText('Latest from Lentine')).toBeVisible();
});
