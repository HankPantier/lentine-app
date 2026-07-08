import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
// NOTE: this test lives outside src/app/ — expo-router treats every file in the routes
// directory as a route and would bundle the test (jest globals crash the dev server).
import AccountRoute from '@/app/account';
import { OnboardingProvider } from '@/onboarding/state';

// The route only navigates; a stub router keeps expo-router out of the test.
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
}));

// No network in these tests. getSession must return the SAME user the stored state carries —
// hydration's auth reconciliation clears userId + subscription when the session is missing.
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(async () => ({ data: { session: { user: { id: 'user-1' } } } })),
    },
    from: jest.fn(),
  },
}));
jest.mock('@/lib/profile', () => ({ persistNotificationPrefs: jest.fn() }));
jest.mock('@/lib/subscription', () => ({ fetchSubscription: jest.fn(async () => null) }));

const mockOpenManage = jest.fn();
jest.mock('@/lib/billing', () => ({
  MANAGE_ON_WEB_URL: 'https://lentinealexis.com/my-account/',
  manageReturnUrl: () => undefined,
  openManageSubscription: (...args: unknown[]) => mockOpenManage(...args),
}));

const mockOpenBrowser = jest.fn(async (..._args: unknown[]) => ({}));
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: (...args: unknown[]) => mockOpenBrowser(...args),
}));

const STORAGE_KEY = 'la_onb_state_v1';

function storedState(subscription: Record<string, unknown> | null) {
  return {
    email: 'member@example.com',
    firstName: 'Lexi',
    userId: 'user-1',
    subscription,
  };
}

const activeSub = {
  tier: 'recipe',
  interval: 'month',
  status: 'active',
  currentPeriodEnd: '2026-08-01T00:00:00Z',
  cancelAtPeriodEnd: false,
};

async function renderWithSub(subscription: Record<string, unknown> | null) {
  await AsyncStorage.clear();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storedState(subscription)));
  return render(
    <OnboardingProvider>
      <AccountRoute />
    </OnboardingProvider>,
  );
}

beforeEach(() => {
  mockOpenManage.mockReset();
  mockOpenBrowser.mockClear();
});

describe('subscription card — manage entry point', () => {
  it('shows Manage subscription for an active member (placeholder is gone)', async () => {
    await renderWithSub(activeSub);
    expect(await screen.findByText('Manage subscription')).toBeTruthy();
    expect(screen.queryByText(/coming soon/i)).toBeNull();
    expect(screen.getByText(/Renews/)).toBeTruthy();
  });

  it('opens the portal URL in the browser when the session resolves', async () => {
    mockOpenManage.mockResolvedValue({ ok: true, url: 'https://billing.stripe.com/session/xyz' });
    await renderWithSub(activeSub);
    fireEvent.press(await screen.findByText('Manage subscription'));
    await waitFor(() =>
      expect(mockOpenBrowser).toHaveBeenCalledWith('https://billing.stripe.com/session/xyz'),
    );
  });

  it('falls back to the website when billing is not manageable via Stripe', async () => {
    mockOpenManage.mockResolvedValue({ ok: false, reason: 'no_stripe_customer' });
    await renderWithSub(activeSub);
    fireEvent.press(await screen.findByText('Manage subscription'));
    expect(await screen.findByText(/managed on lentinealexis\.com/)).toBeTruthy();
    if (Platform.OS === 'ios') {
      // App Store 3.1.1: no external membership-management link on iOS — copy only.
      expect(screen.queryByText('Manage on lentinealexis.com')).toBeNull();
    } else {
      expect(screen.getByText('Manage on lentinealexis.com')).toBeTruthy();
    }
    expect(mockOpenBrowser).not.toHaveBeenCalled();
  });
});

describe('subscription card — states', () => {
  it('renders "Cancels <date>" when cancellation is pending', async () => {
    await renderWithSub({ ...activeSub, cancelAtPeriodEnd: true });
    expect(await screen.findByText(/Cancels/)).toBeTruthy();
    expect(screen.queryByText(/Renews/)).toBeNull();
    // Still manageable — the member may want to un-cancel in the portal.
    expect(screen.getByText('Manage subscription')).toBeTruthy();
  });

  it('renders the ended state (no manage button) for a cancelled subscription', async () => {
    await renderWithSub({ ...activeSub, status: 'cancelled' });
    expect(await screen.findByText('Your membership has ended.')).toBeTruthy();
    expect(screen.queryByText('Manage subscription')).toBeNull();
    expect(screen.getByText('Explore membership')).toBeTruthy();
  });

  it('shows no manage button without a subscription', async () => {
    await renderWithSub(null);
    expect(await screen.findByText('No active subscription.')).toBeTruthy();
    expect(screen.queryByText('Manage subscription')).toBeNull();
  });
});
