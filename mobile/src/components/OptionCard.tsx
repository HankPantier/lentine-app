import { Pressable, View } from 'react-native';
import { colors } from '@/theme/tokens';
import { Text } from './Text';

/**
 * A single-select (radio) option row, shared by the dosha quiz and the edit-answers screen.
 * White fill, sharp corners, blue border + filled dot when selected — per the design system.
 */
export function OptionCard({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: selected ? colors.blue : colors.gray,
        padding: 16,
      }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          borderWidth: 1,
          borderColor: colors.blue,
          backgroundColor: selected ? colors.blue : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 3,
        }}
      >
        {selected ? (
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white }} />
        ) : null}
      </View>
      <Text style={{ flex: 1, fontSize: 15, lineHeight: 22, color: colors.blue }}>{label}</Text>
    </Pressable>
  );
}
