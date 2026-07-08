import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, useWindowDimensions, View } from 'react-native';
import RenderHtml from 'react-native-render-html';
import { AppHeader, Button, Eyebrow, Heading, Screen, Text } from '@/components';
import { getArticlePreview } from '@/lib/article-preview';
import { type Article, type ArticleDetail, fetchArticle } from '@/lib/articles';
import { canAccess, entitledTier } from '@/lib/entitlement';
import { formatLongDate } from '@/lib/format';
import { useOnboarding } from '@/onboarding/state';
import { colors, fg, fonts } from '@/theme/tokens';

/**
 * The navy members-only panel shown in place of a gated body. Signed-out members get the
 * sign-in rescue (the old single CTA opened the same article on the website — where they hit
 * the same wall); everyone gets a path to explore membership in-app.
 */
function MembersOnlyPanel({ item }: { item: Article }) {
  const router = useRouter();
  const { state, update } = useOnboarding();
  return (
    <View style={{ backgroundColor: colors.blue, padding: 18, marginTop: 20 }}>
      <Eyebrow light color={colors.blueLight} style={{ marginBottom: 6 }}>
        Members only
      </Eyebrow>
      <Text style={{ color: colors.white, fontSize: 15, lineHeight: 23 }}>
        {`Your membership unlocks the full ${item.type === 'recipe' ? 'recipe' : 'article'}. Active members see it here automatically.`}
      </Text>
      {!state.userId ? (
        <Button
          label="Already a member? Sign in"
          variant="ghostLight"
          size="sm"
          onPress={() => {
            update({ mode: 'migrating' });
            router.push('/signup');
          }}
          style={{ marginTop: 14 }}
        />
      ) : null}
      <Button
        label="Explore membership"
        variant="ghostLight"
        size="sm"
        onPress={() => router.push('/membership')}
        style={{ marginTop: state.userId ? 14 : 10 }}
      />
    </View>
  );
}

/**
 * In-app article view. Loads the full article from the wp-articles edge function, which
 * returns the body only to verified paid members. Members → rendered HTML; everyone else →
 * excerpt + a members-only prompt. `undefined` = loading, `null` = failed to load.
 *
 * The header (image/category/title/date) renders instantly from the feed's preview of the
 * tapped card — only the body waits on the network. Cold deep links have no preview and fall
 * back to the loading spinner.
 */
export default function ArticleRoute() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { width } = useWindowDimensions();
  const { state } = useOnboarding();
  const [detail, setDetail] = useState<ArticleDetail | null | undefined>(undefined);
  const [attempt, setAttempt] = useState(0);
  const preview = slug ? getArticlePreview(slug) : undefined;

  useEffect(() => {
    let active = true;
    if (slug) fetchArticle(slug).then((d) => active && setDetail(d));
    return () => {
      active = false;
    };
  }, [slug, attempt]);

  if (detail === null) {
    return (
      <Screen>
        <AppHeader onBack={() => router.back()} />
        <Heading>Article unavailable</Heading>
        <Text style={{ color: fg.secondary, fontSize: 15, lineHeight: 23, marginTop: 12 }}>
          We couldn&rsquo;t load this article right now.
        </Text>
        <Button
          label="Try again"
          size="sm"
          onPress={() => {
            setDetail(undefined); // back to the loading state while the retry runs
            setAttempt((n) => n + 1);
          }}
          style={{ marginTop: 16, alignSelf: 'flex-start' }}
        />
      </Screen>
    );
  }

  const summary: Article | undefined = detail ?? preview;
  if (!summary) {
    // Cold open (deep link/refresh) — nothing to paint until the fetch resolves.
    return (
      <Screen>
        <AppHeader onBack={() => router.back()} />
        <View style={{ paddingVertical: 48, alignItems: 'center' }}>
          <ActivityIndicator color={colors.blue} />
        </View>
      </Screen>
    );
  }

  const contentWidth = Math.max(width - 48, 240); // Screen has 24px horizontal padding
  // While the fetch is in flight, the client's own entitlement rule predicts the outcome; the
  // server response stays authoritative and simply confirms (or corrects) it on arrival.
  const predictedLocked = !canAccess(summary, entitledTier(state.subscription));

  return (
    <Screen>
      <AppHeader onBack={() => router.back()} title={summary.type === 'recipe' ? 'Recipe' : 'Article'} />

      {summary.image ? (
        <Image
          source={{ uri: summary.image }}
          style={{ width: '100%', height: 200, marginBottom: 18 }}
          contentFit="cover"
          transition={150}
          accessibilityIgnoresInvertColors
        />
      ) : null}

      {summary.category ? <Eyebrow color={colors.blueBright}>{summary.category}</Eyebrow> : null}
      <Heading size={28} style={{ marginTop: 8 }}>
        {summary.title}
      </Heading>
      <Text style={{ color: fg.tertiary, fontSize: 13, marginTop: 8, marginBottom: 16 }}>
        {formatLongDate(summary.date)}
      </Text>

      {detail === undefined ? (
        <View>
          <Text style={{ color: fg.secondary, fontSize: 16, lineHeight: 25 }}>{summary.excerpt}</Text>
          {predictedLocked ? (
            <MembersOnlyPanel item={summary} />
          ) : (
            <View style={{ paddingVertical: 28, alignItems: 'center' }}>
              <ActivityIndicator color={colors.blue} />
            </View>
          )}
        </View>
      ) : detail.locked || !detail.contentHtml ? (
        <View>
          <Text style={{ color: fg.secondary, fontSize: 16, lineHeight: 25 }}>{detail.excerpt}</Text>
          <MembersOnlyPanel item={detail} />
        </View>
      ) : (
        <RenderHtml
          contentWidth={contentWidth}
          source={{ html: detail.contentHtml }}
          baseStyle={{ color: colors.blue, fontFamily: fonts.regular, fontSize: 16, lineHeight: 26 }}
          systemFonts={[fonts.regular, fonts.semibold, fonts.bold, fonts.italic]}
          tagsStyles={{
            a: { color: colors.blueBright, textDecorationLine: 'none' },
            h2: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 30, marginTop: 8 },
            h3: { fontFamily: fonts.semibold, fontSize: 19, lineHeight: 26, marginTop: 8 },
            // Recipe bodies (assembled by the edge function) use h4 section headings + ul/ol lists.
            h4: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, marginTop: 12, marginBottom: 2 },
            p: { marginTop: 6, marginBottom: 6 },
            ul: { marginTop: 4, marginBottom: 8 },
            ol: { marginTop: 4, marginBottom: 8 },
            strong: { fontFamily: fonts.bold },
            em: { fontFamily: fonts.italic },
            li: { lineHeight: 26 },
          }}
          enableExperimentalMarginCollapsing
        />
      )}
    </Screen>
  );
}
