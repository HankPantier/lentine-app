import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { Button, Eyebrow, Heading, OnbTopBar, Screen, Text } from '@/components';
import { TIER_NAME } from '@/onboarding/pricing';
import { useOnboarding } from '@/onboarding/state';
import { progress } from '@/onboarding/steps';
import { colors, fg } from '@/theme/tokens';

// Mocked existing subscription. In M2 this comes from the member's real Supabase record.
const MOCK = { tier: 'back_to_forward' as const, interval: 'year' as const, renews: 'November 3, 2026' };

export default function TierConfirmRoute() {
  const router = useRouter();
  const { state, update } = useOnboarding();
  const { current, total } = progress(state.mode, 'tier_confirm');

  // Reflect the existing subscription in state so Home shows it correctly.
  useEffect(() => {
    update({ tier: MOCK.tier, interval: MOCK.interval });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen>
      <OnbTopBar onBack={() => router.back()} current={current} total={total} />
      <Eyebrow>Your membership</Eyebrow>
      <Heading style={{ marginTop: 8, marginBottom: 8 }}>
        You&rsquo;re all{' '}
        <Text italic style={{ fontSize: 30, lineHeight: 35 }}>
          set
        </Text>
      </Heading>
      <Text style={{ color: fg.secondary, fontSize: 15, lineHeight: 23, marginBottom: 20 }}>
        Welcome back. Your subscription carried over — no need to re-enter anything.
      </Text>

      <View style={{ backgroundColor: colors.blue, padding: 20 }}>
        <Eyebrow light color={colors.blueLight}>
          Active subscription
        </Eyebrow>
        <Text style={{ color: colors.white, fontSize: 22, marginTop: 6 }}>
          {TIER_NAME[MOCK.tier]}
        </Text>
        <View style={{ marginTop: 12, gap: 4 }}>
          <Text style={{ color: fg.onDarkSecondary, fontSize: 14 }}>
            Billed {MOCK.interval === 'year' ? 'yearly' : 'monthly'}
          </Text>
          <Text style={{ color: fg.onDarkSecondary, fontSize: 14 }}>{`Renews ${MOCK.renews}`}</Text>
          <Text style={{ color: fg.onDarkSecondary, fontSize: 14 }}>
            Payment method on file · •••• 4242
          </Text>
        </View>
      </View>

      <Button
        label="Continue"
        fullWidth
        size="lg"
        onPress={() => router.push('/notifications')}
        style={{ marginTop: 24 }}
      />
      <Text italic style={{ color: fg.tertiary, fontSize: 12, marginTop: 16, lineHeight: 18 }}>
        Manage or cancel anytime from Settings. (Demo — subscription details are mocked.)
      </Text>
    </Screen>
  );
}
