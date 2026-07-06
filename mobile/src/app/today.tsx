import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AppHeader, ArticleCard, Button, Eyebrow, Heading, Screen, Text } from '@/components';
import { DOSHA_CONTENT, type ContentItem } from '@/content/dosha-content';
import { setArticlePreview } from '@/lib/article-preview';
import { type Article, fetchToday } from '@/lib/articles';
import { canAccess, entitledTier } from '@/lib/entitlement';
import { useOnboarding } from '@/onboarding/state';
import { DOSHA } from '@/quiz/doshas';
import { colors, fg } from '@/theme/tokens';

function ContentCard({ item }: { item: ContentItem }) {
  return (
    <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray, padding: 18 }}>
      <Text weight="semibold" style={{ fontSize: 17, color: colors.blue }}>
        {item.title}
      </Text>
      <Text style={{ color: fg.secondary, fontSize: 13, marginTop: 4 }}>{item.meta}</Text>
    </View>
  );
}

/**
 * The dosha-personalized content landing — a placeholder surface that today renders sample
 * content from @/content/dosha-content and will later render real WordPress/CMS content.
 * No dosha yet → invite the member to take the quiz.
 */
export default function TodayRoute() {
  const router = useRouter();
  const { state } = useOnboarding();
  const dosha = state.dosha;

  // Real dosha-matched recipes from WordPress. null = loading; [] = none published yet.
  // Failures get their own retry state so an API error never reads as "coming soon".
  const [recipes, setRecipes] = useState<Article[] | null>(null);
  const [recipesFailed, setRecipesFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const tier = entitledTier(state.subscription);
  useEffect(() => {
    if (!dosha) return;
    let active = true;
    fetchToday(dosha).then(
      (r) => {
        if (!active) return;
        setRecipes(r);
        setRecipesFailed(false);
      },
      () => active && setRecipesFailed(true),
    );
    return () => {
      active = false;
    };
  }, [dosha, attempt]);
  const retryRecipes = () => {
    setRecipesFailed(false);
    setRecipes(null);
    setAttempt((n) => n + 1);
  };

  if (!dosha) {
    return (
      <Screen>
        <AppHeader onBack={() => router.back()} />
        <Eyebrow>For you</Eyebrow>
        <Heading style={{ marginTop: 8 }}>
          Find your{' '}
          <Text italic style={{ fontSize: 30, lineHeight: 35 }}>
            dosha
          </Text>
        </Heading>
        <Text style={{ color: fg.secondary, fontSize: 15, lineHeight: 23, marginTop: 12 }}>
          Take the two-minute quiz and this page fills with rituals and recipes shaped around
          your constitution.
        </Text>
        <Button label="Take the quiz" onPress={() => router.push('/quiz-intro')} style={{ marginTop: 20 }} />
      </Screen>
    );
  }

  const d = DOSHA[dosha];
  const content = DOSHA_CONTENT[dosha];

  return (
    <Screen padding={0}>
      {/* Hero */}
      <View style={{ backgroundColor: colors.blue, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 32 }}>
        <AppHeader onBack={() => router.back()} dark />
        <Eyebrow light color={colors.blueLight}>
          {`For your ${d.name}`}
        </Eyebrow>
        <Heading dark size={30} style={{ marginTop: 8 }}>
          Today,{' '}
          <Text italic style={{ color: d.accent, fontSize: 30, lineHeight: 35 }}>
            for you
          </Text>
        </Heading>
        <Text style={{ color: fg.onDarkSecondary, fontSize: 15, lineHeight: 23, marginTop: 12 }}>
          {content.focus}
        </Text>
      </View>

      <View style={{ padding: 24, gap: 20 }}>
        <View>
          <Eyebrow style={{ marginBottom: 8 }}>Today&rsquo;s ritual</Eyebrow>
          <ContentCard item={content.ritual} />
        </View>

        <View>
          <Eyebrow style={{ marginBottom: 8 }}>{`Made for your ${d.name}`}</Eyebrow>
          <ContentCard item={content.recipe} />
        </View>

        {/* Real dosha-matched recipes pulled from WordPress. */}
        <View>
          <Eyebrow style={{ marginBottom: 8 }}>{`${d.name} recipes`}</Eyebrow>
          {recipesFailed ? (
            <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray, padding: 18 }}>
              <Text style={{ color: fg.secondary, fontSize: 14, lineHeight: 21 }}>
                Couldn&rsquo;t load recipes right now.
              </Text>
              <Button label="Try again" size="sm" onPress={retryRecipes} style={{ marginTop: 12 }} />
            </View>
          ) : recipes === null ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator color={colors.blue} />
            </View>
          ) : recipes.length === 0 ? (
            <View
              style={{
                borderWidth: 1,
                borderColor: colors.blueLight,
                borderStyle: 'dashed',
                padding: 18,
              }}
            >
              <Eyebrow color={colors.blueBright} style={{ marginBottom: 6 }}>
                More coming soon
              </Eyebrow>
              <Text style={{ color: fg.secondary, fontSize: 14, lineHeight: 21 }}>
                Fresh recipes tuned to your {d.name} constitution are on the way.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              {recipes.map((a) => (
                <ArticleCard
                  key={a.id}
                  article={a}
                  locked={!canAccess(a, tier)}
                  onPress={() => {
                    // The reader paints instantly from this summary while the body loads.
                    setArticlePreview(a);
                    router.push({ pathname: '/articles/[slug]', params: { slug: a.slug } });
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </Screen>
  );
}
