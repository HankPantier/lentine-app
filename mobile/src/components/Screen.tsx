import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme/tokens';
import { BackGlyph } from './AppHeader';
import { Eyebrow } from './Eyebrow';
import { ProgressDots } from './ProgressDots';

interface ScreenProps {
  children: ReactNode;
  background?: string;
  padding?: number;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

/** Standard screen wrapper: safe-area aware, scrollable, taupe by default. */
export function Screen({
  children,
  background = colors.taupe,
  padding = 24,
  scroll = true,
  contentStyle,
}: ScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: background }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[{ padding, flexGrow: 1 }, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ padding, flex: 1 }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

/** Navy variant for hero/reveal moments. */
export function DarkScreen(props: Omit<ScreenProps, 'background'>) {
  return <Screen background={colors.blue} {...props} />;
}

interface TopBarProps {
  onBack?: () => void;
  current: number;
  total: number;
  dark?: boolean;
  onSkip?: () => void;
}

/** Onboarding top bar: back affordance (the shared BackGlyph), centered progress dots, optional skip. */
export function OnbTopBar({ onBack, current, total, dark = false, onSkip }: TopBarProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 28,
      }}
    >
      <View style={{ width: 44 }}>{onBack ? <BackGlyph onPress={onBack} dark={dark} /> : null}</View>
      <ProgressDots current={current} total={total} dark={dark} />
      <View style={{ width: 44, alignItems: 'flex-end' }}>
        {onSkip ? (
          <Pressable onPress={onSkip} hitSlop={12} accessibilityRole="button">
            <Eyebrow light={dark}>Skip</Eyebrow>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
