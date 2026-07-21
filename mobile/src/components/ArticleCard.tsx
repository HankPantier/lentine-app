import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import type { Article } from '@/lib/articles';
import { colors, fg } from '@/theme/tokens';
import { Eyebrow } from './Eyebrow';
import { SeasonDoshaMeta } from './SeasonDoshaMeta';
import { Text } from './Text';

/** Human label for the post type, shown as the card's eyebrow prefix and used by the type sort. */
function typeLabel(type: Article['type']): string {
  return type === 'recipe' ? 'Recipe' : 'Article';
}

/** The "🔒 Members" badge shared by both variants. */
function LockBadge() {
  return (
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
  );
}

/**
 * A WordPress feed preview (post or recipe): featured image, type + category, headline, excerpt.
 * Sharp-cornered white card per the design system; tapping opens the in-app article. When
 * `locked`, a "Members" badge signals the full body is gated to an entitled tier.
 *
 * `variant="compact"` renders a horizontal row (small thumbnail, no excerpt) for secondary
 * sections like home's "More from Lentine". `flag` adds a small accent tag in the meta row —
 * e.g. { label: 'For you', color: DOSHA[d].accent } on dosha-matched items.
 */
export function ArticleCard({
  article,
  locked = false,
  onPress,
  variant = 'default',
  flag,
}: {
  article: Article;
  locked?: boolean;
  onPress: () => void;
  variant?: 'default' | 'compact';
  flag?: { label: string; color: string };
}) {
  const meta = article.category ? `${typeLabel(article.type)} · ${article.category}` : typeLabel(article.type);
  const a11yLabel = `${article.title}${locked ? ', members only' : ''}`;

  if (variant === 'compact') {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        style={{
          backgroundColor: colors.white,
          borderWidth: 1,
          borderColor: colors.gray,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {article.image ? (
          <Image
            source={{ uri: article.image }}
            style={{ width: 72, height: 72 }}
            contentFit="cover"
            transition={150}
            accessibilityIgnoresInvertColors
          />
        ) : null}
        <View style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Eyebrow color={colors.blueBright} style={{ flexShrink: 1 }}>
              {meta}
            </Eyebrow>
            {locked ? <LockBadge /> : null}
          </View>
          <Text
            weight="semibold"
            numberOfLines={2}
            style={{ fontSize: 15, lineHeight: 20, color: colors.blue, marginTop: 4 }}
          >
            {article.title}
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
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
      {/* The site's metadata band sits directly under the image, before the card copy. */}
      <SeasonDoshaMeta season={article.season} dosha={article.dosha} />
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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {flag ? (
              <Text
                italic
                weight="semibold"
                style={{
                  fontSize: 10,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: flag.color,
                  marginLeft: 8,
                }}
              >
                {flag.label}
              </Text>
            ) : null}
            {locked ? <LockBadge /> : null}
          </View>
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
