import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Eyebrow, Field, Heading, OnbTopBar, Screen, Text } from '@/components';
import { money, TIER_NAME, totalDue } from '@/onboarding/pricing';
import { useOnboarding } from '@/onboarding/state';
import { progress } from '@/onboarding/steps';
import { colors, fg } from '@/theme/tokens';

const digits = (s: string) => s.replace(/\D/g, '');

function formatCard(s: string): string {
  return digits(s)
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

function formatExpiry(s: string): string {
  const d = digits(s).slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`;
}

export default function PaymentRoute() {
  const router = useRouter();
  const { state } = useOnboarding();
  const tier = state.tier ?? 'recipe';
  const interval = state.interval ?? 'month';
  const { current, total } = progress(state.mode, 'payment');

  const [num, setNum] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const [processing, setProcessing] = useState(false);

  const valid = digits(num).length >= 15 && digits(exp).length >= 4 && digits(cvc).length >= 3;
  const due = totalDue(tier, interval);

  const pay = () => {
    if (!valid || processing) return;
    // M1: mocked — no real Stripe call. Real billing arrives in M3.
    setProcessing(true);
    setTimeout(() => router.push('/notifications'), 700);
  };

  return (
    <Screen>
      <OnbTopBar onBack={() => router.back()} current={current} total={total} />
      <Eyebrow>Payment</Eyebrow>
      <Heading style={{ marginTop: 8, marginBottom: 20 }}>
        Almost{' '}
        <Text italic style={{ fontSize: 30, lineHeight: 35 }}>
          there
        </Text>
      </Heading>

      {/* Summary */}
      <View style={{ backgroundColor: colors.blue, padding: 18, marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Eyebrow light color={colors.blueLight}>
              {interval === 'year' ? 'Billed yearly' : 'Billed monthly'}
            </Eyebrow>
            <Text style={{ color: colors.white, fontSize: 18, marginTop: 4 }}>{TIER_NAME[tier]}</Text>
          </View>
          <Text weight="bold" style={{ color: colors.white, fontSize: 24 }}>
            {money(due)}
          </Text>
        </View>
      </View>

      <Field label="Card number" value={num} onChangeText={(t) => setNum(formatCard(t))} placeholder="1234 5678 9012 3456" keyboardType="number-pad" />
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <View style={{ flex: 1 }}>
          <Field label="Expiry" value={exp} onChangeText={(t) => setExp(formatExpiry(t))} placeholder="MM/YY" keyboardType="number-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="CVC" value={cvc} onChangeText={(t) => setCvc(digits(t).slice(0, 4))} placeholder="123" keyboardType="number-pad" secureTextEntry />
        </View>
      </View>

      <Button
        label={processing ? 'Processing…' : `Pay ${money(due)} and start`}
        fullWidth
        size="lg"
        disabled={!valid || processing}
        onPress={pay}
        style={{ marginTop: 12 }}
      />
      <Text italic style={{ color: fg.tertiary, fontSize: 12, marginTop: 16, lineHeight: 18 }}>
        🔒 Payments are encrypted and processed securely. (Demo — no real charge is made.)
      </Text>
    </Screen>
  );
}
