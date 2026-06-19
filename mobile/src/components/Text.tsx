import { Text as RNText, type TextProps } from 'react-native';
import { colors, fonts } from '@/theme/tokens';

export type TextWeight = 'regular' | 'semibold' | 'bold';

export interface AppTextProps extends TextProps {
  italic?: boolean;
  weight?: TextWeight;
}

function family(weight: TextWeight, italic: boolean): string {
  if (weight === 'bold') return italic ? fonts.boldItalic : fonts.bold;
  if (weight === 'semibold') return italic ? fonts.semiboldItalic : fonts.semibold;
  return italic ? fonts.italic : fonts.regular;
}

/**
 * Brand text. Applies Mulish (the Galano Classic stand-in) with the right weight/italic
 * font file — RN has no CSS font inheritance, so every Text must set its family explicitly.
 * Defaults to navy; override color via `style` on dark screens.
 */
export function Text({ italic = false, weight = 'regular', style, ...rest }: AppTextProps) {
  return (
    <RNText
      {...rest}
      style={[{ fontFamily: family(weight, italic), color: colors.blue }, style]}
    />
  );
}
