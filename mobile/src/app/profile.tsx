import { useRouter } from 'expo-router';
import { Button, Eyebrow, Field, Heading, OnbTopBar, Screen, Text } from '@/components';
import { useOnboarding } from '@/onboarding/state';
import { progress } from '@/onboarding/steps';

export default function ProfileRoute() {
  const router = useRouter();
  const { state, update } = useOnboarding();
  const valid = state.firstName.trim().length > 1;
  const { current, total } = progress(state.mode, 'profile');

  return (
    <Screen>
      <OnbTopBar onBack={() => router.back()} current={current} total={total} />
      <Eyebrow>A little about you</Eyebrow>
      <Heading style={{ marginTop: 8, marginBottom: 24 }}>
        What should I{' '}
        <Text italic style={{ fontSize: 30, lineHeight: 35 }}>
          call you?
        </Text>
      </Heading>

      <Field
        label="First name"
        value={state.firstName}
        onChangeText={(firstName) => update({ firstName })}
        placeholder="First name"
        autoCapitalize="words"
        autoComplete="name"
        autoFocus
      />
      <Field
        label="Last name (optional)"
        value={state.lastName}
        onChangeText={(lastName) => update({ lastName })}
        placeholder="Last name"
        autoCapitalize="words"
      />

      <Button
        label="Continue"
        fullWidth
        size="lg"
        disabled={!valid}
        onPress={() => router.push('/quiz')}
        style={{ marginTop: 12 }}
      />
    </Screen>
  );
}
