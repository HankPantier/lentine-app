import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Button, Eyebrow, Heading, OnbTopBar, Screen, Text } from '@/components';
import { type Tier, useOnboarding } from '@/onboarding/state';
import { progress } from '@/onboarding/steps';
import { colors, fg } from '@/theme/tokens';

interface TierDef {
  id: Tier;
  eyebrow: string;
  name: string;
  priceMo: number;
  bullets: string[];
  featured?: boolean;
}

const TIERS: TierDef[] = [
  {
    id: 'recipe',
    eyebrow: 'Weekly infusion',
    name: 'Recipe Club',
    priceMo: 9,
    bullets: ['Dosha-matched recipes', 'New drops every week', 'Seasonal guidance'],
  },
  {
    id: 'back_to_forward',
    eyebrow: 'Full immersion',
    name: 'Back to Forward',
    priceMo: 29,
    bullets: [
      'Everything in Recipe Club',
      'The full Back to Forward program',
      'Rituals, practices & deep dives',
      'Members-only library',
    ],
    featured: true,
  },
];

function TierCard({ tier, selected, onPress }: { tier: TierDef; selected: boolean; onPress: () => void }) {
  const dark = tier.featured;
  const bg = dark ? colors.blue : colors.white;
  const text = dark ? colors.white : colors.blue;
  const sub = dark ? fg.onDarkSecondary : fg.secondary;
  const borderColor = selected ? colors.blueLight : dark ? colors.blue : colors.gray;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{ backgroundColor: bg, borderWidth: 2, borderColor, padding: 20 }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Eyebrow light={dark} color={dark ? colors.blueLight : colors.blueBright}>
          {tier.eyebrow}
        </Eyebrow>
        {tier.featured ? (
          <View style={{ backgroundColor: colors.blueLight, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text italic style={{ color: colors.blue, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
              Most popular
            </Text>
          </View>
        ) : null}
      </View>

      <Heading dark={dark} size={26} style={{ marginTop: 8 }}>
        {tier.name}
      </Heading>
      <Text style={{ color: text, fontSize: 15, marginTop: 4 }}>
        <Text weight="bold" style={{ color: text, fontSize: 22 }}>{`$${tier.priceMo}`}</Text>
        <Text style={{ color: sub }}> / month</Text>
      </Text>

      <View style={{ marginTop: 14, gap: 6 }}>
        {tier.bullets.map((b) => (
          <View key={b} style={{ flexDirection: 'row', gap: 8 }}>
            <Text style={{ color: colors.blueLight, fontSize: 14, lineHeight: 21 }}>✓</Text>
            <Text style={{ color: sub, fontSize: 14, lineHeight: 21, flex: 1 }}>{b}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

export default function TierRoute() {
  const router = useRouter();
  const { state, update } = useOnboarding();
  const { current, total } = progress(state.mode, 'tier');

  return (
    <Screen>
      <OnbTopBar onBack={() => router.back()} current={current} total={total} />
      <Eyebrow>Choose your membership</Eyebrow>
      <Heading style={{ marginTop: 8, marginBottom: 24 }}>
        Pick the path that{' '}
        <Text italic style={{ fontSize: 30, lineHeight: 35 }}>
          fits you
        </Text>
      </Heading>

      <View style={{ gap: 16 }}>
        {TIERS.map((t) => (
          <TierCard
            key={t.id}
            tier={t}
            selected={state.tier === t.id}
            onPress={() => update({ tier: t.id })}
          />
        ))}
      </View>

      <Button
        label="Continue"
        fullWidth
        size="lg"
        disabled={!state.tier}
        onPress={() => router.push('/billing')}
        style={{ marginTop: 24 }}
      />
    </Screen>
  );
}
