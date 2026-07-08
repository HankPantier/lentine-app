import type { Page } from '@playwright/test';

/** localStorage key the supabase-js client persists its session under (web AsyncStorage). */
export const SB_SESSION_KEY = 'sb-cnarqxhknjtqaovmzsco-auth-token';

/**
 * A far-future supabase-js session. Hydration now reconciles persisted onboarding auth
 * against the REAL session — any test that seeds a truthy userId must also seed this,
 * or the app will (correctly) treat the state as stale and clear userId/subscription.
 */
export function fakeSession(userId = 'u_1', email = 'member@example.com') {
  return JSON.stringify({
    access_token: 'fake-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: 9999999999,
    refresh_token: 'fake-refresh-token',
    user: { id: userId, email, aud: 'authenticated', role: 'authenticated' },
  });
}

/** Seed the fake supabase session alongside whatever state the spec already seeds. */
export async function seedSession(page: Page, userId = 'u_1') {
  await page.addInitScript(
    ([k, v]) => window.localStorage.setItem(k, v),
    [SB_SESSION_KEY, fakeSession(userId)] as const,
  );
}
