import { useRouter } from 'expo-router';
import { Button, Eyebrow, Field, Heading, OnbTopBar, Screen, Text } from '@/components';
import { supabase } from '@/lib/supabase';
import { useOnboarding } from '@/onboarding/state';
import { progress } from '@/onboarding/steps';

export default function ProfileRoute() {
  const router = useRouter();
  const { state, update } = useOnboarding();
  const valid = state.firstName.trim().length > 1;
  const { current, total } = progress(state.mode, 'profile');

  // Save the entered name to the user's own profile row (allowed by the "profiles: update
  // own" RLS policy). Fire-and-forget: local state already drives the UI, so a slow/failed
  // write must not block onboarding.
  const onContinue = () => {
    const displayName = `${state.firstName} ${state.lastName}`.trim();
    if (state.userId && displayName) {
      void supabase
        .from('profiles')
        .update({ display_name: displayName })
        .eq('id', state.userId)
        .then(({ error }) => {
          if (error) console.warn('profile name save failed:', error.message);
        });
    }
    router.push('/quiz-intro');
  };

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
        onPress={onContinue}
        style={{ marginTop: 12 }}
      />
    </Screen>
  );
}
