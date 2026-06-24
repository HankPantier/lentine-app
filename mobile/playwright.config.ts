import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config for the Expo web build. The web app persists onboarding/account state in
 * localStorage under `la_onb_state_v1` (AsyncStorage's web shim), which the specs seed to
 * land directly on the member surfaces — see e2e/onboarding.spec.ts for the rationale.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:8081',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run web',
    url: 'http://localhost:8081',
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
