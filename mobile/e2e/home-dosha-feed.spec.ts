import { expect, type Page, test } from '@playwright/test';

/**
 * Dosha-flagged home feed: items tagged with the member's dosha lead in a "For your <Dosha>"
 * section (accent eyebrow + "For you" tag), everything else renders compact under
 * "More from Lentine" where the sort chips apply. No dosha / no matches -> the original
 * flat "Latest from Lentine" list.
 */

const STORAGE_KEY = 'la_onb_state_v1';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

const MATCHED_RECIPE = {
  id: 1,
  slug: 'cooling-mint-lassi',
  type: 'recipe' as const,
  visibility: 'free' as const,
  title: 'Cooling Mint Lassi',
  excerpt: 'A pitta-soothing summer drink.',
  image: null,
  category: 'NOURISH',
  date: '2026-06-18T10:00:00',
  link: 'https://example.com/lassi',
  dosha: ['pitta', 'vata'],
};

const OTHER_RECIPE = {
  id: 2,
  slug: 'golden-kitchari',
  type: 'recipe' as const,
  visibility: 'paid' as const,
  title: 'Golden Kitchari',
  excerpt: 'A warming, grounding bowl.',
  image: null,
  category: 'NOURISH',
  date: '2026-06-20T10:00:00',
  link: 'https://example.com/kitchari',
  dosha: ['kapha'],
};

const POST = {
  id: 3,
  slug: 'summer-strength',
  type: 'post' as const,
  visibility: 'free' as const,
  title: 'Summer Strength Rituals',
  excerpt: 'Movement for the season.',
  image: null,
  category: 'MOVE',
  date: '2026-06-19T10:00:00',
  link: 'https://example.com/strength',
  dosha: [],
};

function memberState(over: Record<string, unknown> = {}) {
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
    tier: null,
    interval: null,
    subscription: null,
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

async function mockList(page: Page, articles: unknown[]) {
  await page.route('**/functions/v1/wp-articles', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 200, headers: CORS, body: 'ok' });
    const body = JSON.parse(route.request().postData() || '{}');
    if (body.action === 'list') {
      return route.fulfill({ status: 200, headers: CORS, body: JSON.stringify({ articles }) });
    }
    return route.fulfill({
      status: 200,
      headers: CORS,
      body: JSON.stringify({ article: { ...MATCHED_RECIPE, locked: false, contentHtml: '<p>Blend and serve.</p>' } }),
    });
  });
}

async function titleY(page: Page, title: string): Promise<number> {
  const box = await page.getByText(title, { exact: true }).first().boundingBox();
  if (!box) throw new Error(`title not found: ${title}`);
  return box.y;
}

test('dosha-matched items lead in a For-your section with the For-you tag', async ({ page }) => {
  await seed(page, memberState());
  await mockList(page, [OTHER_RECIPE, POST, MATCHED_RECIPE]); // matched is the OLDEST — position must come from the section, not the date
  await page.goto('/home');

  await expect(page.getByText('For your Pitta', { exact: true })).toBeVisible();
  await expect(page.getByText('For you', { exact: true })).toHaveCount(1);
  await expect(page.getByText('More from Lentine')).toBeVisible();
  await expect(page.getByText('Latest from Lentine')).toHaveCount(0);

  // The matched (oldest) item still renders above both unmatched ones.
  const matchedY = await titleY(page, MATCHED_RECIPE.title);
  expect(matchedY).toBeLessThan(await titleY(page, OTHER_RECIPE.title));
  expect(matchedY).toBeLessThan(await titleY(page, POST.title));
});

test('sort chips reorder only the More section', async ({ page }) => {
  await seed(page, memberState());
  await mockList(page, [OTHER_RECIPE, POST, MATCHED_RECIPE]);
  await page.goto('/home');

  // Recent (default): recipe (06-20) above post (06-19) within the More section.
  expect(await titleY(page, OTHER_RECIPE.title)).toBeLessThan(await titleY(page, POST.title));

  // Type sort: posts group before recipes — order flips inside More…
  await page.getByRole('button', { name: 'Sort by Type' }).click();
  expect(await titleY(page, POST.title)).toBeLessThan(await titleY(page, OTHER_RECIPE.title));
  // …while the matched item stays pinned on top.
  expect(await titleY(page, MATCHED_RECIPE.title)).toBeLessThan(await titleY(page, POST.title));
});

test('no matches keeps the flat Latest list', async ({ page }) => {
  await seed(page, memberState()); // pitta member
  await mockList(page, [OTHER_RECIPE, POST]); // kapha-only + untagged
  await page.goto('/home');

  await expect(page.getByText('Latest from Lentine')).toBeVisible();
  await expect(page.getByText('For your Pitta', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Sort by Type' })).toBeVisible();
});

test('no dosha keeps the flat list even when items carry tags', async ({ page }) => {
  await seed(page, memberState({ dosha: null, doshaScores: null, doshaTakenAt: null, quizDone: false }));
  await mockList(page, [OTHER_RECIPE, POST, MATCHED_RECIPE]);
  await page.goto('/home');

  await expect(page.getByText('Latest from Lentine')).toBeVisible();
  await expect(page.getByText('For you', { exact: true })).toHaveCount(0);
});

test('compact cards keep the lock badge and open the reader', async ({ page }) => {
  await seed(page, memberState()); // no subscription -> paid item locked
  await mockList(page, [OTHER_RECIPE, POST, MATCHED_RECIPE]);
  await page.goto('/home');

  // The paid unmatched recipe renders compact with its Members badge.
  await expect(page.getByText('Members', { exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: MATCHED_RECIPE.title }).click();
  await expect(page).toHaveURL(/\/articles\//);
});
