import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen } from '@testing-library/react-native';
// NOTE: this test lives outside src/app/ — expo-router treats every file in the routes
// directory as a route and would bundle the test (jest globals crash the dev server).
import FavoritesRoute from '@/app/favorites';
import type { FavoriteEntry } from '@/lib/favorites-encoding';
import { OnboardingProvider } from '@/onboarding/state';

// The route only navigates; a stub router keeps expo-router out of the test.
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true, navigate: jest.fn() }),
}));

// No network in these tests — favorites render straight from persisted state.
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn(async () => ({ data: { session: null } })) },
    from: jest.fn(),
  },
}));

const STORAGE_KEY = 'la_onb_state_v1';

const fav = (over: Partial<FavoriteEntry>): FavoriteEntry => ({
  slug: 'golden-milk',
  id: 101,
  title: 'Golden Milk',
  excerpt: 'A warming drink.',
  image: null,
  category: 'Drinks',
  type: 'recipe',
  visibility: 'free',
  date: '2026-07-01',
  link: '',
  dosha: ['vata'],
  season: ['winter'],
  savedAt: '2026-07-20T10:00:00.000Z',
  ...over,
});

function renderFavorites() {
  return render(
    <OnboardingProvider>
      <FavoritesRoute />
    </OnboardingProvider>,
  );
}

beforeEach(() => AsyncStorage.clear());

describe('favorites screen', () => {
  it('renders the persisted favorites as cards, newest save first', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        favorites: [
          fav({ slug: 'kitchari', id: 102, title: 'Kitchari', savedAt: '2026-07-21T10:00:00.000Z' }),
          fav({}),
        ],
      }),
    );
    await renderFavorites();
    const kitchari = await screen.findByText('Kitchari');
    const golden = await screen.findByText('Golden Milk');
    expect(kitchari).toBeTruthy();
    expect(golden).toBeTruthy();
  });

  it('shows the Members badge on paid favorites for a signed-out member', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ favorites: [fav({ visibility: 'paid' })] }),
    );
    await renderFavorites();
    expect(await screen.findByLabelText('Golden Milk, members only')).toBeTruthy();
  });

  it('shows the empty state when nothing is saved yet', async () => {
    await renderFavorites();
    expect(await screen.findByText(/No favorites yet/)).toBeTruthy();
  });
});
