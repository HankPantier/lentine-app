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
  // All four seasons -> never demoted by the season-aware order, so the sort assertions
  // below stay valid year-round. Dosha deliberately excludes the seeded member's (pitta).
  season: ['spring', 'summer', 'fall', 'winter'],
  dosha: ['vata', 'kapha'],
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

const POST_BODY = '<p>Strength is a summer practice.</p><h3>The flow</h3><p>Five rounds, easy.</p>';

// A recipe body shaped like la_assemble_recipe_body's output: a long intro (forces real
// scrolling so the Jump-to-Recipe pill has work to do), then Ingredients + Instructions.
const RECIPE_BODY =
  Array.from({ length: 30 }, (_, i) => `<p>Intro paragraph ${i + 1} — the story behind this bowl.</p>`).join('') +
  '<h3>Recipe Notes</h3><p>Soak the rice.</p>' +
  '<h3>Ingredients</h3><ul><li>1 cup basmati rice</li><li>1/2 cup mung dal</li></ul>' +
  '<h3>Instructions</h3><ol><li><p>Rinse and cook.</p></li></ol>';

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
      ? { ...summary, locked: false, contentHtml: summary.type === 'recipe' ? RECIPE_BODY : POST_BODY }
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

test('the Type chip filters the feed by content type and Recent resets', async ({ page }) => {
  await seed(page, completedState());
  await mockArticles(page, []);
  await page.goto('/home');

  // Default "Recent": everything visible, newest first.
  expect(await titleY(page, RECIPE.title)).toBeLessThan(await titleY(page, POST.title));

  // Type -> Recipes: only the recipe remains.
  await page.getByRole('button', { name: 'Filter by type' }).click();
  await page.getByRole('button', { name: 'Show Recipes' }).click();
  await expect(page.getByText(RECIPE.title, { exact: true })).toBeVisible();
  await expect(page.getByText(POST.title, { exact: true })).toHaveCount(0);
  await expect(page.getByText(FREE.title, { exact: true })).toHaveCount(0);

  // Type -> Articles: only the posts remain.
  await page.getByRole('button', { name: 'Show Articles' }).click();
  await expect(page.getByText(POST.title, { exact: true })).toBeVisible();
  await expect(page.getByText(RECIPE.title, { exact: true })).toHaveCount(0);

  // Recent resets to everything.
  await page.getByRole('button', { name: 'Show everything, newest first' }).click();
  await expect(page.getByText(RECIPE.title, { exact: true })).toBeVisible();
  await expect(page.getByText(POST.title, { exact: true })).toBeVisible();
});

test('the Category chip lets the reader choose a category', async ({ page }) => {
  await seed(page, completedState());
  await mockArticles(page, []);
  await page.goto('/home');

  await page.getByRole('button', { name: 'Filter by category' }).click();
  await page.getByRole('button', { name: 'Show NOURISH' }).click();
  await expect(page.getByText(RECIPE.title, { exact: true })).toBeVisible();
  await expect(page.getByText(POST.title, { exact: true })).toHaveCount(0);
  await expect(page.getByText(FREE.title, { exact: true })).toHaveCount(0);

  // Tapping the selected value again toggles back to everything.
  await page.getByRole('button', { name: 'Show NOURISH' }).click();
  await expect(page.getByText(POST.title, { exact: true })).toBeVisible();
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
  await expect(page.getByText('1 cup basmati rice', { exact: false })).toBeVisible();
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

test('the recipe card and reader show the season + dosha meta lines; posts show none', async ({ page }) => {
  await seed(page, completedState(subOf('recipe')));
  await mockArticles(page, [RECIPE.slug, FREE.slug]);
  await page.goto('/home');

  // Feed card (default variant) carries the meta lines.
  await expect(page.getByText('Spring, Summer, Fall, Winter', { exact: true })).toBeVisible();
  await expect(page.getByText('Vata, Kapha', { exact: true })).toBeVisible();

  // The reader mirrors the site's metadata bar under the title (direct load — the pushed
  // home screen can stay mounted in the web DOM and would double the text matches).
  await page.goto(`/articles/${RECIPE.slug}`);
  await expect(page.getByText('Spring, Summer, Fall, Winter', { exact: true })).toBeVisible();
  await expect(page.getByText('Vata, Kapha', { exact: true })).toBeVisible();

  // A post has neither tag → no meta lines in its reader.
  await page.goto(`/articles/${FREE.slug}`);
  await expect(page.getByText(FREE.title, { exact: true })).toBeVisible();
  await expect(page.getByText('Season', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Dosha', { exact: true })).toHaveCount(0);
});

test('Jump to Recipe scrolls to the Ingredients section, then the pill hides', async ({ page }) => {
  await seed(page, completedState(subOf('recipe')));
  await mockArticles(page, [RECIPE.slug]);
  await page.goto(`/articles/${RECIPE.slug}`);

  // The long intro pushes Ingredients well below the fold; the pill floats over it.
  const pill = page.getByRole('button', { name: 'Jump to recipe ingredients' });
  await expect(pill).toBeVisible();
  await expect(page.getByText('Ingredients', { exact: true })).not.toBeInViewport();

  await pill.click();
  await expect(page.getByText('Ingredients', { exact: true })).toBeInViewport();
  // Arriving at the recipe hides (unmounts) the pill.
  await expect(page.getByRole('button', { name: 'Jump to recipe ingredients' })).toHaveCount(0);
});

test('the reader back button falls back to home on a cold open (no history)', async ({ page }) => {
  await seed(page, completedState());
  await mockArticles(page, [FREE.slug]);
  await page.goto(`/articles/${FREE.slug}`);
  await expect(page.getByText(FREE.title, { exact: true })).toBeVisible();

  // Deep link/refresh has no navigation history — back must land home, not GO_BACK-crash.
  await page.getByRole('button', { name: 'Go back' }).click();
  await expect(page).toHaveURL(/\/home/);
});

test('the pill never renders for locked recipes or posts', async ({ page }) => {
  await seed(page, completedState({ subscription: null, tier: null, interval: null }));
  await mockArticles(page, [FREE.slug]);

  // Locked recipe: members-only panel, no pill.
  await page.goto(`/articles/${RECIPE.slug}`);
  await expect(page.getByText('Members only')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Jump to recipe ingredients' })).toHaveCount(0);

  // Unlocked post: full body, still no pill (nothing to jump to).
  await page.goto(`/articles/${FREE.slug}`);
  await expect(page.getByText('Strength is a summer practice', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Jump to recipe ingredients' })).toHaveCount(0);
});
