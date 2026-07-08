import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen } from '@testing-library/react-native';
// NOTE: this test lives outside src/app/ — expo-router treats every file in the routes
// directory as a route and would bundle the test (jest globals crash the dev server).
import AccountRoute from '@/app/account';
import { OnboardingProvider } from '@/onboarding/state';

// The route only navigates; a stub router keeps expo-router out of the test.
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
}));

// No network in these tests — the screen only touches supabase/profile on user action.
jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { updateUser: jest.fn(), signOut: jest.fn() }, from: jest.fn() },
}));
jest.mock('@/lib/profile', () => ({ persistNotificationPrefs: jest.fn() }));

const STORAGE_KEY = 'la_onb_state_v1';

/** A returning member's persisted state: prefs deliberately all-OFF (≠ the all-on default). */
const storedState = {
  email: 'member@example.com',
  firstName: 'Lexi',
  userId: 'user-1',
  notificationPrefs: { rituals: false, recipes: false, btf: false },
};

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storedState));
});

function renderAccount() {
  return render(
    <OnboardingProvider>
      <AccountRoute />
    </OnboardingProvider>,
  );
}

describe('account screen hydration', () => {
  it('seeds the notification toggles from persisted prefs, not the defaults', async () => {
    await renderAccount();
    // findBy waits for hydration; the toggles must reflect the member's saved all-off prefs
    // (pre-fix, mounting before hydration seeded them from the all-on default).
    const rituals = await screen.findByLabelText('Daily rituals');
    expect(rituals.props.accessibilityState?.checked ?? rituals.props['aria-checked']).toBe(false);
    const recipes = await screen.findByLabelText('New recipes');
    expect(recipes.props.accessibilityState?.checked ?? recipes.props['aria-checked']).toBe(false);
  });

  it('seeds the email field from persisted state', async () => {
    await renderAccount();
    expect(await screen.findByDisplayValue('member@example.com')).toBeTruthy();
  });
});

describe('account notification toggles a11y', () => {
  it('exposes checkbox role + checked state to the accessibility tree', async () => {
    await renderAccount();
    // RN normalizes the aria-checked prop into accessibilityState on native; the web
    // DOM-level aria-checked contract is covered by e2e/account.spec.ts (toBeChecked).
    expect(screen.getByRole('checkbox', { name: 'Daily rituals', checked: false })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'New recipes', checked: false })).toBeTruthy();
  });
});
