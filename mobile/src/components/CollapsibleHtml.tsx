import { type ReactNode, useState } from 'react';
import { type LayoutChangeEvent, Pressable, View } from 'react-native';
import { colors } from '@/theme/tokens';
import { Text } from './Text';

/**
 * Collapses long recipe descriptions behind a "Read more" toggle (NYT-style). The intro is
 * rendered by react-native-render-html — a View/Text tree, not a single <Text> — so it can't
 * be clamped with numberOfLines. Instead the caller's rendered content is measured via
 * onLayout, then clipped with maxHeight + overflow:'hidden' while collapsed. Portable: the
 * same code clips identically on iOS, Android, and web.
 *
 * The caller passes its OWN <RenderHtml> (with its exact styles) as children, so this stays
 * render-agnostic and both reader intro sites keep their own config.
 */

const DEFAULT_MAX = 220;
/** Content only marginally taller than the cap isn't worth a toggle. */
const SLOP = 8;

/** Whether measured content is tall enough to warrant collapsing. Pure — unit-tested. */
export function shouldCollapse(
  measuredHeight: number | null,
  collapsedMaxHeight: number,
  slop: number = SLOP,
): boolean {
  return measuredHeight != null && measuredHeight > collapsedMaxHeight + slop;
}

/** A taupe-to-transparent fade over the clipped bottom edge — no gradient dependency. */
function Fade() {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 48 }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            backgroundColor: colors.taupe,
            // Top band nearly transparent → bottom band opaque, so text fades into the page.
            opacity: (i + 1) / 6,
          }}
        />
      ))}
    </View>
  );
}

export function CollapsibleHtml({
  children,
  collapsedMaxHeight = DEFAULT_MAX,
}: {
  children: ReactNode;
  collapsedMaxHeight?: number;
}) {
  const [measured, setMeasured] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Re-fires on size changes (e.g. an inline image loading), so the latest height wins.
  const onLayout = (e: LayoutChangeEvent) => setMeasured(e.nativeEvent.layout.height);

  const collapsible = shouldCollapse(measured, collapsedMaxHeight);
  const clipped = collapsible && !expanded;

  return (
    <View>
      <View style={clipped ? { maxHeight: collapsedMaxHeight, overflow: 'hidden' } : undefined}>
        <View testID="collapsible-inner" onLayout={onLayout}>
          {children}
        </View>
        {clipped ? <Fade /> : null}
      </View>
      {collapsible ? (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          accessibilityRole="button"
          hitSlop={8}
          style={{ paddingVertical: 6, alignSelf: 'flex-start' }}
        >
          <Text
            italic
            style={{
              color: colors.blueBright,
              fontSize: 12,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}
          >
            {expanded ? 'Read less ↑' : 'Read more ↓'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
