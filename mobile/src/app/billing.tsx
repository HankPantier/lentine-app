import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Button, Eyebrow, Heading, OnbTopBar, Screen, Text } from '@/components';
import { type Interval, useOnboarding } from '@/onboarding/state';
import { annualSavings, money, monthlyEquivalent, totalDue } from '@/onboarding/pricing';
import { progress } from '@/onboarding/steps';
import { colors, fg } from '@/theme/tokens';

export default function BillingRoute() {
  const router = useRouter();
  const { state, update } = useOnboarding();
  const tier = state.tier ?? 'recipe';
  const { current, total } = progress(state.mode, 'billing');

  const options: { id: Interval; label: string }[] = [
    { id: 'month', label: 'Monthly' },
    { id: 'year', label: 'Annual' },
  ];

  return (
    <Screen>
      <OnbTopBar onBack={() => router.back()} current={current} total={total} />
      <Eyebrow>Billing</Eyebrow>
      <Heading style={{ marginTop: 8, marginBottom: 24 }}>
        How would you like to{' '}
        <Text italic style={{ fontSize: 30, lineHeight: 35 }}>
          pay?
        </Text>
      </Heading>

      <View style={{ gap: 16 }}>
        {options.map((opt) => {
          const selected = state.interval === opt.id;
          const perMonth = monthlyEquivalent(tier, opt.id);
          const save = annualSavings(tier);
          return (
            <Pressable
              key={opt.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => update({ interval: opt.id })}
              style={{
                backgroundColor: colors.white,
                borderWidth: 2,
                borderColor: selected ? colors.blueLight : colors.gray,
                padding: 18,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View>
                <Text weight="semibold" style={{ fontSize: 17, color: colors.blue }}>
                  {opt.label}
                </Text>
                {opt.id === 'year' ? (
                  <Text italic style={{ color: colors.green, fontSize: 13, marginTop: 2 }}>
                    {`Save ${money(save)} a year`}
                  </Text>
                ) : (
                  <Text style={{ color: fg.secondary, fontSize: 13, marginTop: 2 }}>
                    Billed monthly
                  </Text>
                )}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text weight="bold" style={{ fontSize: 22, color: colors.blue }}>
                  {money(Math.round(perMonth * 100) / 100)}
                </Text>
                <Text style={{ color: fg.tertiary, fontSize: 12 }}>/ month</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Button
        label="Continue"
        fullWidth
        size="lg"
        disabled={!state.interval}
        onPress={() => router.push('/payment')}
        style={{ marginTop: 24 }}
      />
      <Text italic style={{ color: fg.tertiary, fontSize: 12, marginTop: 16, lineHeight: 18 }}>
        {state.interval
          ? `You'll be charged ${money(totalDue(tier, state.interval))} ${
              state.interval === 'year' ? 'per year' : 'per month'
            }. Cancel anytime from Settings.`
          : 'Cancel anytime from Settings.'}
      </Text>
    </Screen>
  );
}
