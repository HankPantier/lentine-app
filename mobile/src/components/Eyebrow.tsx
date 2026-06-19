import type { StyleProp, TextStyle } from 'react-native';
import { colors, fg } from '@/theme/tokens';
import { Text } from './Text';

interface Props {
  children: string;
  /** Use on dark backgrounds. */
  light?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
}

/** The brand's signature small-caps eyebrow: tiny, tracked, italic, uppercase. */
export function Eyebrow({ children, light = false, color, style }: Props) {
  return (
    <Text
      italic
      style={[
        {
          fontSize: 11,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          lineHeight: 14,
          color: color ?? (light ? fg.onDarkSecondary : colors.blueBright),
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
