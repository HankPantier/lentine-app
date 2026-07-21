import { expect, type Page, test } from '@playwright/test';

/**
 * Exercises the favorites flow end-to-end in the browser: heart a recipe in the reader,
 * find it on /favorites (via the header heart), open it from the list, un-heart it, and
 * verify persistence across a reload. All signed-out — favorites are local-first; the
 * Supabase merge on sign-in is covered by unit tests (mergeFavorites) and staging.
 */

const STORAGE_KEY = 'la_onb_state_v1';

const RECIPE = {
  id: 2,
  slug: 'golden-kitchari',
  type: 'recipe' as const,
  visibility: 'free' as const,
  title: 'Golden Kitchari',
  excerpt: 'A warming, grounding bowl for any season.',
  image: null,
  category: 'NOURISH',
  date: '2026-06-20T10:00:00',
  link: 'https://lentinealexis.com/recipe/golden-kitchari',
  season: ['winter'],
  dosha: ['vata', 'kapha'],
};

const RECIPE_BODY =
  '<p>The story behind this bowl.</p>' +
  '<h3>Ingredients</h3><ul><li>1 cup basmati rice</li></ul>' +
  '<h3>Instructions</h3><ol><li><p>Rinse and cook.</p></li></ol>';

function completedState(over: Record<string, unknown> = {}) {
  return JSON.stringify({
    mode: 'migrating',
    email: 'member@example.com',
    firstName: 'Maya',
    userId: null,
    dosha: 'pitta',
    doshaScores: { vata: 3, pitta: 6, kapha: 3 },
    doshaTakenAt: '2026-06-01T00:00:00.000Z',
    answers: Array(12).fill(null),
    quizDone: true,
    completed: true,
    ...over,
  });
}

// Seed only when the key is absent: init scripts re-run on EVERY document load, and a
// blind set would wipe the favorites the app itself persisted before a goto()/reload().
async function seed(page: Page, json: string) {
  await page.addInitScript(
    ([k, v]) => {
      if (!window.localStorage.getItem(k)) window.localStorage.setItem(k, v);
    },
    [STORAGE_KEY, json] as const,
  );
}

async function mockArticles(page: Page) {
  await page.route('**/functions/v1/wp-articles', async (route) => {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 200, headers: cors, body: 'ok' });
    }
    const body = JSON.parse(route.request().postData() || '{}');
    if (body.action === 'list') {
      return route.fulfill({ status: 200, headers: cors, body: JSON.stringify({ articles: [RECIPE] }) });
    }
    return route.fulfill({
      status: 200,
      headers: cors,
      body: JSON.stringify({ article: { ...RECIPE, locked: false, contentHtml: RECIPE_BODY } }),
    });
  });
}

test('heart a recipe in the reader, see it on /favorites, and open it from the list', async ({ page }) => {
  await seed(page, completedState());
  await mockArticles(page);
  await page.goto(`/articles/${RECIPE.slug}`);
  await expect(page.getByText(RECIPE.title, { exact: true })).toBeVisible();

  // Heart it — the toggle flips to the remove state.
  await page.getByRole('button', { name: 'Save to favorites' }).click();
  await expect(page.getByRole('button', { name: 'Remove from favorites' })).toBeVisible();

  // The header heart is the persistent route to the list ("Favorites" alone — substring
  // matching would also catch the reader's "Remove from favorites" toggle).
  await page.getByRole('button', { name: 'Favorites', exact: true }).click();
  await expect(page).toHaveURL(/\/favorites/);
  await expect(page.getByText('Saved by you', { exact: false })).toBeVisible();
  // Scope to the card button: the reader behind this pushed screen stays mounted in the
  // web DOM, so bare text would match its heading too.
  const card = page.getByRole('button', { name: RECIPE.title });
  await expect(card).toBeVisible();

  // A favorite opens back into the reader.
  await card.click();
  await expect(page).toHaveURL(/\/articles\//);
  // .last(): this second reader instance joins the first (still mounted) in the web DOM.
  await expect(page.getByText('1 cup basmati rice', { exact: false }).last()).toBeVisible();
});

test('favorites survive a reload (persisted locally)', async ({ page }) => {
  await seed(page, completedState());
  await mockArticles(page);
  await page.goto(`/articles/${RECIPE.slug}`);
  await page.getByRole('button', { name: 'Save to favorites' }).click();
  await expect(page.getByRole('button', { name: 'Remove from favorites' })).toBeVisible();

  await page.goto('/favorites');
  await page.reload();
  await expect(page.getByText(RECIPE.title, { exact: true })).toBeVisible();
});

test('un-hearting removes the recipe and the list falls back to the empty state', async ({ page }) => {
  await seed(page, completedState());
  await mockArticles(page);
  await page.goto(`/articles/${RECIPE.slug}`);
  await page.getByRole('button', { name: 'Save to favorites' }).click();
  await page.getByRole('button', { name: 'Remove from favorites' }).click();
  await expect(page.getByRole('button', { name: 'Save to favorites' })).toBeVisible();

  await page.goto('/favorites');
  await expect(page.getByText('No favorites yet', { exact: false })).toBeVisible();
  await expect(page.getByText(RECIPE.title, { exact: true })).toHaveCount(0);
});

test('the empty state offers a path back to browsing', async ({ page }) => {
  await seed(page, completedState());
  await mockArticles(page);
  await page.goto('/favorites');
  await expect(page.getByText('No favorites yet', { exact: false })).toBeVisible();

  await page.getByRole('button', { name: 'Browse recipes' }).click();
  await expect(page).toHaveURL(/\/home/);
});

test('the account screen counts saved recipes and links to the list', async ({ page }) => {
  await seed(page, completedState());
  await mockArticles(page);
  await page.goto(`/articles/${RECIPE.slug}`);
  await page.getByRole('button', { name: 'Save to favorites' }).click();
  await expect(page.getByRole('button', { name: 'Remove from favorites' })).toBeVisible();

  await page.goto('/account');
  await expect(page.getByText('1 saved recipe.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View favorites' }).click();
  await expect(page).toHaveURL(/\/favorites/);
  await expect(page.getByText(RECIPE.title, { exact: true })).toBeVisible();
});
