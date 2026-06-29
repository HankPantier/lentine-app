import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import type { Article } from '@/lib/articles';
import { colors, fg } from '@/theme/tokens';
import { Eyebrow } from './Eyebrow';
import { Text } from './Text';

/** Human label for the post type, shown as the card's eyebrow prefix and used by the type sort. */
function typeLabel(type: Article['type']): string {
  return type === 'recipe' ? 'Recipe' : 'Article';
}

/**
 * A WordPress feed preview (post or recipe): featured image, type + category, headline, excerpt.
 * Sharp-cornered white card per the design system; tapping opens the in-app article. When
 * `locked`, a "Members" badge signals the full body is gated to an entitled tier.
 */
export function ArticleCard({
  article,
  locked = false,
  onPress,
}: {
  article: Article;
  locked?: boolean;
  onPress: () => void;
}) {
  const meta = article.category ? `${typeLabel(article.type)} · ${article.category}` : typeLabel(article.type);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${article.title}${locked ? ', members only' : ''}`}
      style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray }}
    >
      {article.image ? (
        <Image
          source={{ uri: article.image }}
          style={{ width: '100%', height: 180 }}
          contentFit="cover"
          transition={150}
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <View style={{ padding: 18 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
          }}
        >
          <Eyebrow color={colors.blueBright} style={{ flexShrink: 1 }}>
            {meta}
          </Eyebrow>
          {locked ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 8 }}>
              <Text style={{ fontSize: 11, lineHeight: 13 }}>🔒</Text>
              <Text
                style={{
                  fontSize: 10,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  color: fg.tertiary,
                }}
              >
                Members
              </Text>
            </View>
          ) : null}
        </View>
        <Text weight="semibold" style={{ fontSize: 17, lineHeight: 23, color: colors.blue }}>
          {article.title}
        </Text>
        {article.excerpt ? (
          <Text numberOfLines={2} style={{ color: fg.secondary, fontSize: 14, lineHeight: 21, marginTop: 6 }}>
            {article.excerpt}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
