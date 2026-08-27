import { View } from 'react-native';
import { colors } from '@/theme/tokens';

/**
 * A dependency-free bottom-up navy scrim for legible text over imagery. Approximates a
 * vertical gradient by stacking equal-opacity bands of increasing height (darkest at the
 * bottom, fading to clear near the top) — no expo-linear-gradient needed. Absolutely fills
 * its parent and ignores touches; render it between the image and the overlaid text.
 */
export function GradientScrim({ bands = 16 }: { bands?: number }) {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} pointerEvents="none">
      {Array.from({ length: bands }, (_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            // Tallest band first (faintest, covers most); each shorter band stacks darker
            // toward the bottom. Many low-opacity bands sum to a smooth (step-free) ramp.
            height: `${(100 * (bands - i)) / bands}%`,
            backgroundColor: colors.blue,
            opacity: 0.08,
          }}
        />
      ))}
    </View>
  );
}
