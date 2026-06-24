import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, useWindowDimensions, View } from 'react-native';
import RenderHtml from 'react-native-render-html';
import { Button, Eyebrow, Heading, Screen, Text } from '@/components';
import { type ArticleDetail, fetchArticle } from '@/lib/articles';
import { formatLongDate } from '@/lib/format';
import { colors, fg, fonts } from '@/theme/tokens';

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={{ marginBottom: 20, alignSelf: 'flex-start' }}
    >
      <Text style={{ fontSize: 26, lineHeight: 26, color: colors.blue }}>←</Text>
    </Pressable>
  );
}

/**
 * In-app article view. Loads the full article from the wp-articles edge function, which
 * returns the body only to verified paid members. Members → rendered HTML; everyone else →
 * excerpt + a members-only prompt. `undefined` = loading, `null` = failed to load.
 */
export default function ArticleRoute() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { width } = useWindowDimensions();
  const [detail, setDetail] = useState<ArticleDetail | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    if (slug) fetchArticle(slug).then((d) => active && setDetail(d));
    return () => {
      active = false;
    };
  }, [slug]);

  if (detail === undefined) {
    return (
      <Screen>
        <BackButton onPress={() => router.back()} />
        <View style={{ paddingVertical: 48, alignItems: 'center' }}>
          <ActivityIndicator color={colors.blue} />
        </View>
      </Screen>
    );
  }

  if (detail === null) {
    return (
      <Screen>
        <BackButton onPress={() => router.back()} />
        <Heading>Article unavailable</Heading>
        <Text style={{ color: fg.secondary, fontSize: 15, lineHeight: 23, marginTop: 12 }}>
          We couldn&rsquo;t load this article right now. Please try again later.
        </Text>
      </Screen>
    );
  }

  const contentWidth = Math.max(width - 48, 240); // Screen has 24px horizontal padding

  return (
    <Screen>
      <BackButton onPress={() => router.back()} />

      {detail.image ? (
        <Image
          source={{ uri: detail.image }}
          style={{ width: '100%', height: 200, marginBottom: 18 }}
          contentFit="cover"
          transition={150}
          accessibilityIgnoresInvertColors
        />
      ) : null}

      {detail.category ? <Eyebrow color={colors.blueBright}>{detail.category}</Eyebrow> : null}
      <Heading size={28} style={{ marginTop: 8 }}>
        {detail.title}
      </Heading>
      <Text style={{ color: fg.tertiary, fontSize: 13, marginTop: 8, marginBottom: 16 }}>
        {formatLongDate(detail.date)}
      </Text>

      {detail.locked || !detail.contentHtml ? (
        <View>
          <Text style={{ color: fg.secondary, fontSize: 16, lineHeight: 25 }}>{detail.excerpt}</Text>
          <View
            style={{
              backgroundColor: colors.blue,
              padding: 18,
              marginTop: 20,
            }}
          >
            <Eyebrow light color={colors.blueLight} style={{ marginBottom: 6 }}>
              Members only
            </Eyebrow>
            <Text style={{ color: colors.white, fontSize: 15, lineHeight: 23 }}>
              Your membership unlocks the full article. Active members see it here automatically.
            </Text>
            <Button
              label="Open on the website"
              variant="ghostLight"
              size="sm"
              onPress={() => Linking.openURL(detail.link)}
              style={{ marginTop: 14 }}
            />
          </View>
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
