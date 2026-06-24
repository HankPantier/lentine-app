import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable } from 'react-native';
import { Button, Eyebrow, Field, Heading, OnbTopBar, Screen, Text } from '@/components';
import { supabase } from '@/lib/supabase';
import { fetchSubscription } from '@/lib/subscription';
import { useOnboarding } from '@/onboarding/state';
import { progress } from '@/onboarding/steps';
import { colors, fg } from '@/theme/tokens';

export default function SignupRoute() {
  const router = useRouter();
  const { state, update } = useOnboarding();
  const valid = state.email.includes('@') && state.password.length >= 6;

  // The returning-member ("migrating") path reuses this email+password screen with
  // sign-in copy, then skips straight to the quiz (no profile/tier setup).
  const migrating = state.mode === 'migrating';
  const { current, total } = progress(state.mode, migrating ? 'signin' : 'signup');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Returning member: real Supabase sign-in, then pull their subscription for tier-confirm.
  async function signIn() {
    setBusy(true);
    setError(null);
    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email: state.email.trim(),
      password: state.password,
    });
    if (authErr || !data.user) {
      setError(authErr?.message ?? 'Could not sign in.');
      setBusy(false);
      return;
    }
    update({ userId: data.user.id, subscription: await fetchSubscription(data.user.id) });
    setBusy(false);
    router.push('/quiz-intro');
  }

  // New user: create the auth account. The DB trigger creates their profile row. With
  // "Confirm email" disabled (staging) signUp returns a session immediately.
  async function signUp() {
    setBusy(true);
    setError(null);
    setNotice(null);
    const { data, error: authErr } = await supabase.auth.signUp({
      email: state.email.trim(),
      password: state.password,
    });
    if (authErr) {
      setError(authErr.message);
      setBusy(false);
      return;
    }
    if (!data.session) {
      // Email confirmation is on — no session yet. Can't continue the gated flow.
      setNotice('Account created. Check your email to confirm, then sign in.');
      setBusy(false);
      return;
    }
    update({ userId: data.user?.id ?? null });
    setBusy(false);
    router.push('/profile');
  }

  // First login (migrated user with no password) OR a genuine forgot-password. Sends a
  // recovery link that lands on /set-password. Cross-platform redirect: web origin vs the
  // lentine:// deep link.
  async function sendPasswordSetup() {
    setBusy(true);
    setError(null);
    setNotice(null);
    const redirectTo =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? `${window.location.origin}/set-password`
        : Linking.createURL('/set-password');
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(state.email.trim(), {
      redirectTo,
    });
    setBusy(false);
    if (resetErr) {
      setError(resetErr.message);
      return;
    }
    setNotice('Check your email for a link to set your password.');
  }

  const primaryLabel = busy
    ? migrating
      ? 'Signing in…'
      : 'Creating account…'
    : migrating
      ? 'Sign in'
      : 'Continue';

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
        onChangeText={(email) => {
          update({ email });
          if (error) setError(null);
        }}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoComplete="email"
      />
      <Field
        label="Password"
        value={state.password}
        onChangeText={(password) => {
          update({ password });
          if (error) setError(null);
        }}
        secureTextEntry
        autoComplete="password"
        hint={migrating ? undefined : 'At least 6 characters'}
        error={error ?? undefined}
      />

      <Button
        label={primaryLabel}
        fullWidth
        size="lg"
        disabled={!valid || busy}
        onPress={migrating ? signIn : signUp}
        style={{ marginTop: 12 }}
      />

      {notice ? (
        <Text italic style={{ color: fg.secondary, fontSize: 13, marginTop: 16, lineHeight: 20 }}>
          {notice}
        </Text>
      ) : migrating ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy || !state.email.includes('@')}
          onPress={sendPasswordSetup}
          style={{ marginTop: 20, alignSelf: 'flex-start' }}
        >
          <Text
            italic
            style={{
              color: state.email.includes('@') ? colors.blue : fg.secondary,
              fontSize: 13,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              textDecorationLine: 'underline',
            }}
          >
            First time here, or forgot your password? Set it
          </Text>
        </Pressable>
      ) : (
        <Text italic style={{ color: fg.tertiary, fontSize: 12, marginTop: 16, lineHeight: 18 }}>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </Text>
      )}
    </Screen>
  );
}
