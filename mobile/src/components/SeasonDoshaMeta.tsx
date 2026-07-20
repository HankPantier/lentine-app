import { type StyleProp, View, type ViewStyle } from 'react-native';
import { titleCase } from '@/lib/format';
import { fg } from '@/theme/tokens';
import { Text } from './Text';

/** One "SEASON  Fall, Winter" row: small-caps label + title-cased value list. */
function MetaRow({ label, values }: { label: string; values: string[] }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
      <Text
        italic
        style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', lineHeight: 16, color: fg.tertiary }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 12, lineHeight: 16, color: fg.secondary, flexShrink: 1 }}>
        {values.map(titleCase).join(', ')}
      </Text>
    </View>
  );
}

/**
 * The recipe's season + dosha tags as plain meta lines, mirroring the website's metadata
 * bar ("SEASON: Spring, Summer · DOSHA: Kapha, Pitta"). Renders nothing when both are
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
    <View style={[{ gap: 2 }, style]}>
      {hasSeason ? <MetaRow label="Season" values={season as string[]} /> : null}
      {hasDosha ? <MetaRow label="Dosha" values={dosha as string[]} /> : null}
    </View>
  );
}
