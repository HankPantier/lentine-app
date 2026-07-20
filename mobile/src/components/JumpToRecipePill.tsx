import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii } from '@/theme/tokens';
import { Text } from './Text';

/**
 * The reader's floating "Jump to Recipe" CTA, pinned bottom-right over the scroll view
 * (the app's take on the website's jump button). Fades out — then unmounts, so it stops
 * catching taps — once the reader has scrolled to the recipe (`visible` false), and fades
 * back in if they scroll away again. Animated opacity keeps it web-safe (no native driver).
 */
export function JumpToRecipePill({ visible, onPress }: { visible: boolean; onPress: () => void }) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) setMounted(true);
    const anim = Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: 180, useNativeDriver: false });
    anim.start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
    return () => anim.stop();
  }, [visible, opacity]);

  if (!mounted) return null;
  return (
    <Animated.View style={{ position: 'absolute', right: 24, bottom: insets.bottom + 24, opacity }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Jump to recipe ingredients"
        style={{
          backgroundColor: colors.blue,
          borderRadius: radii.button,
          paddingVertical: 10,
          paddingHorizontal: 18,
          // A soft lift so the pill reads as floating over the article.
          boxShadow: '0 3px 8px rgba(0, 0, 51, 0.3)',
        }}
      >
        <Text
          italic
          style={{ color: colors.white, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}
        >
          Jump to Recipe ↓
        </Text>
      </Pressable>
    </Animated.View>
  );
}
