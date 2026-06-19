import { useState } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii } from '@/theme/tokens';
import { Text } from './Text';

export type ButtonVariant =
  | 'default' // navy fill — primary
  | 'outline' // navy border on light
  | 'important' // orange — one per view
  | 'ghostLight' // transparent w/ light border — on dark screens
  | 'plain'; // text-only link

export type ButtonSize = 'sm' | 'md' | 'lg';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const SIZES: Record<ButtonSize, { padV: number; padH: number; font: number }> = {
  sm: { padV: 8, padH: 16, font: 12 },
  md: { padV: 12, padH: 22, font: 13 },
  lg: { padV: 16, padH: 26, font: 14 },
};

interface Palette {
  bg: string;
  border: string;
  text: string;
  hoverBg: string;
  hoverBorder: string;
  hoverText: string;
}

const PALETTES: Record<ButtonVariant, Palette> = {
  default: {
    bg: colors.blue,
    border: colors.blue,
    text: colors.white,
    hoverBg: colors.blueLight,
    hoverBorder: colors.blueLight,
    hoverText: colors.white,
  },
  outline: {
    bg: 'transparent',
    border: colors.blue,
    text: colors.blue,
    hoverBg: 'transparent',
    hoverBorder: colors.blueLight,
    hoverText: colors.blueLight,
  },
  important: {
    bg: colors.orange,
    border: colors.orange,
    text: colors.white,
    hoverBg: colors.blueLight,
    hoverBorder: colors.blueLight,
    hoverText: colors.white,
  },
  ghostLight: {
    bg: 'transparent',
    border: 'rgba(255,255,255,0.5)',
    text: colors.white,
    hoverBg: 'transparent',
    hoverBorder: colors.blueLight,
    hoverText: colors.blueLight,
  },
  plain: {
    bg: 'transparent',
    border: 'transparent',
    text: colors.blueBright,
    hoverBg: 'transparent',
    hoverBorder: 'transparent',
    hoverText: colors.blueLight,
  },
};

/**
 * Brand CTA — small, italic, uppercase, sharp-ish corners. Hover (web) and press shift
 * filled variants toward the teal highlight, matching the design system's 333ms feel.
 */
export function Button({
  label,
  onPress,
  variant = 'default',
  size = 'md',
  disabled = false,
  fullWidth = false,
  style,
}: Props) {
  const [active, setActive] = useState(false);
  const p = PALETTES[variant];
  const s = SIZES[size];
  const isPlain = variant === 'plain';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setActive(true)}
      onPressOut={() => setActive(false)}
      onHoverIn={() => setActive(true)}
      onHoverOut={() => setActive(false)}
      style={[
        {
          backgroundColor: active ? p.hoverBg : p.bg,
          borderColor: active ? p.hoverBorder : p.border,
          borderWidth: isPlain ? 0 : 2,
          borderRadius: isPlain ? 0 : radii.button,
          paddingVertical: isPlain ? 4 : s.padV,
          paddingHorizontal: isPlain ? 0 : s.padH,
          opacity: disabled ? 0.32 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text
        italic
        style={{
          color: active ? p.hoverText : p.text,
          fontSize: s.font,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
