import { useRouter } from 'expo-router';
import { Button, Eyebrow, Field, Heading, OnbTopBar, Screen, Text } from '@/components';
import { useOnboarding } from '@/onboarding/state';
import { progress } from '@/onboarding/steps';
import { fg } from '@/theme/tokens';

export default function SignupRoute() {
  const router = useRouter();
  const { state, update } = useOnboarding();
  const valid = state.email.includes('@') && state.password.length >= 6;

  // The returning-member ("migrating") path reuses this email+password screen with
  // sign-in copy, then skips straight to the quiz (no profile/tier setup).
  const migrating = state.mode === 'migrating';
  const { current, total } = progress(state.mode, migrating ? 'signin' : 'signup');

  return (
    <Screen>
      <OnbTopBar onBack={() => router.back()} current={current} total={total} />
      <Eyebrow>{migrating ? 'Welcome back' : 'Create your account'}</Eyebrow>
      <Heading style={{ marginTop: 8, marginBottom: 24 }}>
        {migrating ? 'Sign in to ' : 'Let’s get you '}
        <Text italic style={{ fontSize: 30, lineHeight: 35 }}>
          {migrating ? 'your account' : 'set up'}
        </Text>
      </Heading>

      <Field
        label="Email"
        value={state.email}
        onChangeText={(email) => update({ email })}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoComplete="email"
      />
      <Field
        label="Password"
        value={state.password}
        onChangeText={(password) => update({ password })}
        secureTextEntry
        autoComplete="password"
        hint={migrating ? undefined : 'At least 6 characters'}
      />

      <Button
        label={migrating ? 'Sign in' : 'Continue'}
        fullWidth
        size="lg"
        disabled={!valid}
        onPress={() => router.push(migrating ? '/quiz' : '/profile')}
        style={{ marginTop: 12 }}
      />

      {migrating ? (
        <Text italic style={{ color: fg.tertiary, fontSize: 13, marginTop: 16 }}>
          Forgot your password? Reset is coming soon.
        </Text>
      ) : (
        <Text italic style={{ color: fg.tertiary, fontSize: 12, marginTop: 16, lineHeight: 18 }}>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </Text>
      )}
    </Screen>
  );
}
