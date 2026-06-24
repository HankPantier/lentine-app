import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import type { Article } from '@/lib/articles';
import { colors, fg } from '@/theme/tokens';
import { Eyebrow } from './Eyebrow';
import { Text } from './Text';

/**
 * A WordPress article preview: featured image, category, headline, excerpt. Sharp-cornered
 * white card per the design system; tapping opens the in-app article.
 */
export function ArticleCard({ article, onPress }: { article: Article; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={article.title}
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
        {article.category ? (
          <Eyebrow color={colors.blueBright} style={{ marginBottom: 6 }}>
            {article.category}
          </Eyebrow>
        ) : null}
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
