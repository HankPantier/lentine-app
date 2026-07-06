import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { colors } from '@/theme/tokens';
import { Eyebrow } from './Eyebrow';
import { Text } from './Text';
import { Wordmark } from './Wordmark';

/**
 * The one header spacing constant. Before this component, five hand-rolled headers used
 * bottom margins of 28/20/20/0 px — screens that need the gap reference it from here.
 */
export const HEADER_GAP = 20;

/** The wordmark's single sanctioned header width (it previously appeared at 130 AND 210). */
export const HEADER_WORDMARK_WIDTH = 130;

/**
 * The one back-arrow implementation. `alignSelf: 'flex-start'` matters: without it the
 * Pressable stretches to the row width and the whole strip above the title becomes an
 * invisible back button (the account screen shipped that bug).
 */
export function BackGlyph({ onPress, dark = false }: { onPress: () => void; dark?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={{ alignSelf: 'flex-start' }}
    >
      <Text style={{ fontSize: 26, lineHeight: 26, color: dark ? colors.white : colors.blue }}>←</Text>
    </Pressable>
  );
}

interface AppHeaderProps {
  /** Renders the standard back arrow. */
  onBack?: () => void;
  /** Optional centered screen title (Eyebrow-styled). Skip it when the body opens with its own heading. */
  title?: string;
  /** Right-slot content (e.g. the avatar button on home). */
  right?: ReactNode;
  /** White tint for navy backgrounds. */
  dark?: boolean;
  /** Show the wordmark in the left slot instead of a back arrow (home hero). */
  logo?: boolean;
}

/**
 * The app's single header: back/logo on the left, optional title centered, optional action on
 * the right, one bottom gap. Onboarding keeps its own OnbTopBar (progress dots), which shares
 * BackGlyph so the arrow itself is one implementation everywhere.
 */
export function AppHeader({ onBack, title, right, dark = false, logo = false }: AppHeaderProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: HEADER_GAP,
      }}
    >
      <View style={{ minWidth: 44, alignItems: 'flex-start' }}>
        {logo ? (
          <Wordmark width={HEADER_WORDMARK_WIDTH} />
        ) : onBack ? (
          <BackGlyph onPress={onBack} dark={dark} />
        ) : null}
      </View>
      {title ? <Eyebrow light={dark}>{title}</Eyebrow> : null}
      <View style={{ minWidth: 44, alignItems: 'flex-end' }}>{right ?? null}</View>
    </View>
  );
}
