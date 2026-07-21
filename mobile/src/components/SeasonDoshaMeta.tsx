import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { titleCase } from '@/lib/format';
import { colors, fg } from '@/theme/tokens';
import { Text } from './Text';

/** One inline "SEASON: Fall, Winter" field — small-caps label beside its title-cased values. */
function MetaField({ label, values }: { label: string; values: string[] }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
      <Text
        italic
        style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', lineHeight: 17, color: fg.tertiary }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 13, lineHeight: 17, color: colors.blue }}>{values.map(titleCase).join(', ')}</Text>
    </View>
  );
}

/**
 * The website's recipe metadata band — "SEASON: Spring, Summer   DOSHA: Kapha, Pitta" — as a
 * taupe strip framed by a navy hairline, sitting under the hero/card image. Fields flow on
 * one line and wrap as whole units on narrow screens. Renders nothing when both are
 * empty/absent (posts, old cached payloads), so callers can place it unconditionally.
 */
export function SeasonDoshaMeta({
  season,
  dosha,
  style,
}: {
  season?: string[];
  dosha?: string[];
  style?: StyleProp<ViewStyle>;
}) {
  const hasSeason = !!season?.length;
  const hasDosha = !!dosha?.length;
  if (!hasSeason && !hasDosha) return null;
  return (
    <View
      style={[
        {
          backgroundColor: colors.taupe,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.blue,
          paddingVertical: 10,
          paddingHorizontal: 14,
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          columnGap: 22,
          rowGap: 4,
        },
        style,
      ]}
    >
      {hasSeason ? <MetaField label="Season:" values={season as string[]} /> : null}
      {hasDosha ? <MetaField label="Dosha:" values={dosha as string[]} /> : null}
    </View>
  );
}
