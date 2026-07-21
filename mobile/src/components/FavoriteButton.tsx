import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/theme/tokens';
import { Text } from './Text';

/**
 * The heart that saves a recipe to the member's favorites. Presentational — the reader owns
 * the toggle state. Outline navy at rest; filled teal once saved (blueLight is the brand's
 * highlight accent). Text glyphs, matching BackGlyph's approach — no icon dependency.
 */
export function FavoriteButton({
  active,
  onPress,
  style,
}: {
  active: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={active ? 'Remove from favorites' : 'Save to favorites'}
      style={[{ alignSelf: 'flex-start' }, style]}
    >
      <Text style={{ fontSize: 24, lineHeight: 26, color: active ? colors.blueLight : colors.blue }}>
        {active ? '♥' : '♡'}
      </Text>
    </Pressable>
  );
}
