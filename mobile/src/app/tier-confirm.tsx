import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { Button, Eyebrow, Heading, OnbTopBar, Screen, Text } from '@/components';
import { formatLongDate } from '@/lib/format';
import { TIER_NAME } from '@/onboarding/pricing';
import { useOnboarding } from '@/onboarding/state';
import { progress } from '@/onboarding/steps';
import { colors, fg } from '@/theme/tokens';

const STATUS_LABEL: Record<string, string> = {
  active: 'Active subscription',
  trialing: 'Trial subscription',
  past_due: 'Subscription · past due',
  cancelled: 'Subscription · cancelled',
};

export default function TierConfirmRoute() {
  const router = useRouter();
  const { state, update } = useOnboarding();
  const { current, total } = progress(state.mode, 'tier_confirm');
  const sub = state.subscription;

  // Reflect the existing subscription in state so Home shows it correctly.
  useEffect(() => {
    if (sub) update({ tier: sub.tier, interval: sub.interval });
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

      {sub ? (
        <View style={{ backgroundColor: colors.blue, padding: 20 }}>
          <Eyebrow light color={colors.blueLight}>
            {STATUS_LABEL[sub.status] ?? 'Subscription'}
          </Eyebrow>
          <Text style={{ color: colors.white, fontSize: 22, marginTop: 6 }}>
            {TIER_NAME[sub.tier]}
          </Text>
          <View style={{ marginTop: 12, gap: 4 }}>
            <Text style={{ color: fg.onDarkSecondary, fontSize: 14 }}>
              Billed {sub.interval === 'year' ? 'yearly' : 'monthly'}
            </Text>
            <Text style={{ color: fg.onDarkSecondary, fontSize: 14 }}>
              {`Renews ${formatLongDate(sub.currentPeriodEnd)}`}
            </Text>
          </View>
        </View>
      ) : (
        <View style={{ backgroundColor: colors.blue, padding: 20 }}>
          <Text style={{ color: colors.white, fontSize: 15, lineHeight: 23 }}>
            We couldn&rsquo;t find an active subscription on your account. You can pick a plan
            anytime from Settings.
          </Text>
        </View>
      )}

      <Button
        label="Continue"
        fullWidth
        size="lg"
        onPress={() => router.push('/notifications')}
        style={{ marginTop: 24 }}
      />
      <Text italic style={{ color: fg.tertiary, fontSize: 12, marginTop: 16, lineHeight: 18 }}>
        Manage or cancel anytime from Settings.
      </Text>
    </Screen>
  );
}
