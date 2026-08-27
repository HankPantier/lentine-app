import { EvilIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import type { Article } from '@/lib/articles';
import { colors, elevation, fg, radii, rhythm } from '@/theme/tokens';
import { Eyebrow } from './Eyebrow';
import { GradientScrim } from './GradientScrim';
import { SeasonDoshaMeta } from './SeasonDoshaMeta';
import { Text } from './Text';

/** Human label for the post type, shown as the card's eyebrow prefix and used by the type sort. */
function typeLabel(type: Article['type']): string {
  return type === 'recipe' ? 'Recipe' : 'Article';
}

/** The line-art "Members" lock badge shared by both variants. */
function LockBadge() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 8 }}>
      <EvilIcons name="lock" size={18} color={fg.tertiary} />
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
  variant?: 'default' | 'compact' | 'featured';
  flag?: { label: string; color: string };
}) {
  const meta = article.category ? `${typeLabel(article.type)} · ${article.category}` : typeLabel(article.type);
  const a11yLabel = `${article.title}${locked ? ', members only' : ''}`;
  const hasMeta = !!(article.season?.length || article.dosha?.length);

  // Image-forward showcase card (home's "For your Dosha" carousel): full-bleed rounded photo
  // with the headline overlaid on a scrim. Parent sets the width.
  if (variant === 'featured') {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        style={{ borderRadius: radii.media, overflow: 'hidden', backgroundColor: colors.blue, ...elevation.card }}
      >
        {article.image ? (
          <Image
            source={{ uri: article.image }}
            style={{ width: '100%', height: 220 }}
            contentFit="cover"
            transition={150}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={{ width: '100%', height: 220 }} />
        )}
        <GradientScrim />
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Eyebrow color={colors.white} style={{ flexShrink: 1 }}>
              {meta}
            </Eyebrow>
            {flag ? (
              <Text
                italic
                weight="semibold"
                style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: colors.white, marginLeft: 8 }}
              >
                {flag.label}
              </Text>
            ) : null}
          </View>
          <Text weight="semibold" numberOfLines={2} style={{ fontSize: 18, lineHeight: 23, color: colors.white }}>
            {article.title}
          </Text>
        </View>
        {locked ? (
          <View
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: 'rgba(0,0,51,0.55)',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: radii.media,
            }}
          >
            <EvilIcons name="lock" size={18} color={colors.white} />
            <Text style={{ fontSize: 9, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.white }}>Members</Text>
          </View>
        ) : null}
      </Pressable>
    );
  }

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
          ...elevation.card,
        }}
      >
        {article.image ? (
          <View style={{ paddingLeft: 10, paddingVertical: 10 }}>
            <Image
              source={{ uri: article.image }}
              style={{ width: 64, height: 64, borderRadius: radii.media }}
              contentFit="cover"
              transition={150}
              accessibilityIgnoresInvertColors
            />
          </View>
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
      style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray, ...elevation.card }}
    >
      {/* Featured image + its metadata band ride together as one rounded, inset "framed
          photo" — the imagery softens (hybrid radius) while the card frame stays crisp. */}
      {article.image ? (
        <View style={{ paddingTop: rhythm.card, paddingHorizontal: rhythm.card }}>
          <Image
            source={{ uri: article.image }}
            style={{
              width: '100%',
              height: 180,
              borderTopLeftRadius: radii.media,
              borderTopRightRadius: radii.media,
              borderBottomLeftRadius: hasMeta ? 0 : radii.media,
              borderBottomRightRadius: hasMeta ? 0 : radii.media,
            }}
            contentFit="cover"
            transition={150}
            accessibilityIgnoresInvertColors
          />
          <SeasonDoshaMeta
            season={article.season}
            dosha={article.dosha}
            style={{ borderBottomLeftRadius: radii.media, borderBottomRightRadius: radii.media }}
          />
        </View>
      ) : (
        <SeasonDoshaMeta season={article.season} dosha={article.dosha} />
      )}
      <View style={{ padding: rhythm.card }}>
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
