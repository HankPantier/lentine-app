import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
// Lives outside src/app/ so expo-router doesn't bundle the test as a route.
import AccountRoute from '@/app/account';
import { deleteAccount } from '@/lib/account';
import { OnboardingProvider } from '@/onboarding/state';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: mockReplace }),
}));

// A live session matching the persisted userId keeps reconcileAuth a no-op, so the seeded
// subscription survives hydration.
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: jest.fn(),
      signOut: jest.fn(async () => ({ error: null })),
      getSession: jest.fn(async () => ({ data: { session: { user: { id: 'user-1' } } } })),
    },
    from: jest.fn(),
  },
}));
jest.mock('@/lib/profile', () => ({ persistNotificationPrefs: jest.fn() }));
jest.mock('@/lib/subscription', () => ({ fetchSubscription: jest.fn(async () => null) }));
jest.mock('@/lib/account', () => ({ deleteAccount: jest.fn() }));

const mockDelete = deleteAccount as jest.Mock;
const STORAGE_KEY = 'la_onb_state_v1';

const baseState = { email: 'member@example.com', firstName: 'Lexi', userId: 'user-1' };

async function seed(extra: Record<string, unknown> = {}) {
  await AsyncStorage.clear();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...baseState, ...extra }));
}

function renderAccount() {
  return render(
    <OnboardingProvider>
      <AccountRoute />
    </OnboardingProvider>,
  );
}

beforeEach(() => {
  mockReplace.mockReset();
  mockDelete.mockReset();
});

describe('account deletion (Apple 5.1.1(v))', () => {
  it('deletes the account and returns home on confirm', async () => {
    await seed();
    mockDelete.mockResolvedValue({ ok: true });
    await renderAccount();

    await screen.findByText('Sign out'); // gate on hydration before touching the delete UI
    // Two-step guard: the first tap only reveals the confirm — nothing is deleted yet.
    fireEvent.press(screen.getByText('Delete my account'));
    expect(mockDelete).not.toHaveBeenCalled();

    fireEvent.press(await screen.findByText('Permanently delete'));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });

  it('shows an error and does not navigate when deletion fails', async () => {
    await seed();
    mockDelete.mockResolvedValue({ ok: false, reason: 'delete_failed' });
    await renderAccount();

    await screen.findByText('Sign out');
    fireEvent.press(screen.getByText('Delete my account'));
    fireEvent.press(await screen.findByText('Permanently delete'));

    expect(await screen.findByText(/couldn.t delete your account/i)).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('warns that deletion does not cancel an active paid membership', async () => {
    await seed({
      subscription: {
        tier: 'recipe',
        interval: 'month',
        status: 'active',
        currentPeriodEnd: '2027-01-01',
        cancelAtPeriodEnd: false,
      },
    });
    await renderAccount();

    await screen.findByText('Sign out');
    fireEvent.press(screen.getByText('Delete my account'));
    expect(await screen.findByText(/cancel your paid membership/i)).toBeTruthy();
  });
});
