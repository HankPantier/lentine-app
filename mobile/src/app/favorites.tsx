import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { AppHeader, ArticleCard, Button, Eyebrow, Heading, Screen, Text } from '@/components';
import { setArticlePreview } from '@/lib/article-preview';
import { canAccess, entitledTier } from '@/lib/entitlement';
import { useOnboarding } from '@/onboarding/state';
import { colors, fg } from '@/theme/tokens';

/**
 * The member's saved recipes, newest save first. Renders entirely from local state (each
 * favorite is a full Article snapshot taken at heart-tap time) — instant, offline-friendly,
 * no per-slug fetches. Synced with Supabase at sign-in (see syncFavoritesOnAuth).
 */
export default function FavoritesRoute() {
  const router = useRouter();
  const { state } = useOnboarding();
  const tier = entitledTier(state.subscription);
  // toggleFavorite prepends, but a sign-in merge can reorder — sort defensively.
  const favorites = [...state.favorites].sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  return (
    <Screen>
      <AppHeader onBack={goBack} />
      <Eyebrow>Saved by you</Eyebrow>
      <Heading style={{ marginTop: 8, marginBottom: 20 }}>
        Your{' '}
        <Text italic style={{ fontSize: 30, lineHeight: 35 }}>
          favorites
        </Text>
      </Heading>

      {favorites.length === 0 ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.blueLight,
            borderStyle: 'dashed',
            padding: 18,
          }}
        >
          <Eyebrow color={colors.blueBright} style={{ marginBottom: 6 }}>
            Nothing saved yet
          </Eyebrow>
          <Text style={{ color: fg.secondary, fontSize: 14, lineHeight: 21 }}>
            No favorites yet — tap the ♡ on any recipe to keep it here.
          </Text>
          <Button
            label="Browse recipes"
            size="sm"
            onPress={() => router.replace('/home')}
            style={{ marginTop: 12, alignSelf: 'flex-start' }}
          />
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          {favorites.map((f) => (
            <ArticleCard
              key={f.slug}
              article={f}
              variant="compact"
              locked={!canAccess(f, tier)}
              onPress={() => {
                // The reader paints instantly from this summary while the body loads.
                setArticlePreview(f);
                router.push({ pathname: '/articles/[slug]', params: { slug: f.slug } });
              }}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
