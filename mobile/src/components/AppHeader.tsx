import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useOnboarding } from '@/onboarding/state';
import { DOSHA } from '@/quiz/doshas';
import { colors } from '@/theme/tokens';
import { Text } from './Text';
import { Wordmark } from './Wordmark';

/**
 * The one header spacing constant. Before this component, five hand-rolled headers used
 * bottom margins of 28/20/20/0 px — screens that need the gap reference it from here.
 */
export const HEADER_GAP = 20;

/** The wordmark's single sanctioned header width (it previously appeared at 130 AND 210). */
export const HEADER_WORDMARK_WIDTH = 130;

/** Slightly narrower when centered between the back arrow and the avatar. */
const CENTER_WORDMARK_WIDTH = 110;

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

/**
 * The member's avatar — the persistent route to their profile. Initial from their first
 * name, background from their dosha accent (mirrors the home hero's original avatar).
 */
function AccountAvatar() {
  const router = useRouter();
  const { state } = useOnboarding();
  const initial = (state.firstName || 'friend').charAt(0).toUpperCase();
  const accent = DOSHA[state.dosha ?? 'vata'].accent;
  return (
    <Pressable
      onPress={() => router.push('/account')}
      accessibilityRole="button"
      accessibilityLabel="Account"
      hitSlop={10}
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: accent,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text weight="bold" style={{ color: colors.blue, fontSize: 14 }}>
        {initial}
      </Text>
    </Pressable>
  );
}

interface AppHeaderProps {
  /** Renders the standard back arrow (wordmark moves to the center). */
  onBack?: () => void;
  /**
   * Right-slot content. `undefined` (default) = the account avatar — profile access is
   * persistent across screens; `null` = nothing (the account screen itself); any node
   * replaces the avatar.
   */
  right?: ReactNode;
  /** White tint for navy backgrounds. */
  dark?: boolean;
}

/** The wordmark as the brand's home link — tapping it from anywhere lands on /home. */
function HomeWordmark({ width, tint }: { width: number; tint?: string }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.navigate('/home')}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Lentine Alexis home"
    >
      <Wordmark width={width} tint={tint} />
    </Pressable>
  );
}

/**
 * The app's single header, and the two things that persist on EVERY screen: the brand
 * (wordmark — left on hub screens, centered above content behind a back arrow; always a
 * tap-to-home link) and the route to the member's profile (avatar, right). Onboarding keeps
 * its own OnbTopBar (progress dots), which shares BackGlyph so the arrow is one
 * implementation everywhere.
 */
export function AppHeader({ onBack, right, dark = false }: AppHeaderProps) {
  // The white asset reads on navy; tint it brand-navy on light screens.
  const tint = dark ? undefined : colors.blue;
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
        {onBack ? <BackGlyph onPress={onBack} dark={dark} /> : <HomeWordmark width={HEADER_WORDMARK_WIDTH} tint={tint} />}
      </View>
      {onBack ? <HomeWordmark width={CENTER_WORDMARK_WIDTH} tint={tint} /> : null}
      <View style={{ minWidth: 44, alignItems: 'flex-end' }}>{right === undefined ? <AccountAvatar /> : right}</View>
    </View>
  );
}
