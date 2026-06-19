import type { ReactNode } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { colors } from '@/theme/tokens';
import { Text } from './Text';

interface Props {
  children: ReactNode;
  dark?: boolean;
  size?: number;
  style?: StyleProp<TextStyle>;
}

/** Editorial screen heading. Children may include nested <Text italic> for emphasis. */
export function Heading({ children, dark = false, size = 30, style }: Props) {
  return (
    <Text
      style={[
        {
          fontSize: size,
          lineHeight: size * 1.18,
          letterSpacing: -0.3,
          color: dark ? colors.white : colors.blue,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
