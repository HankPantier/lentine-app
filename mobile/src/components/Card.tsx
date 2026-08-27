import type { ReactNode } from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';
import { colors, elevation, rhythm } from '@/theme/tokens';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * The app's standard content surface: white on taupe, a single hairline border, sharp
 * corners, and generous interior padding. Flat fill + sharp corners are deliberate editorial
 * choices — depth comes from whitespace, not shadow. Pass `style` to override padding or add
 * a background (e.g. navy promo panels).
 */
export function Card({ children, style }: Props) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.white,
          borderWidth: 1,
          borderColor: colors.gray,
          padding: rhythm.card,
          ...elevation.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
