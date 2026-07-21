import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable } from 'react-native';
import { Button, Eyebrow, Field, Heading, OnbTopBar, Screen, Text } from '@/components';
import { clearContentCache } from '@/lib/content-cache';
import { fetchNotificationPrefs, fetchProfileName, syncDoshaOnAuth, syncFavoritesOnAuth } from '@/lib/profile';
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
  // Email-confirmation limbo: the account exists but there's no session until the emailed
  // link is clicked. These drive the resend/continue affordances.
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(false);

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
    clearContentCache(); // entitlement just changed — cached locked bodies are stale
    // Pull their subscription (tier-confirm), name (greeting), and notification prefs together.
    const [subscription, name, notificationPrefs] = await Promise.all([
      fetchSubscription(data.user.id),
      fetchProfileName(data.user.id),
      fetchNotificationPrefs(data.user.id),
    ]);
    update({
      userId: data.user.id,
      subscription,
      ...(name ? { firstName: name.firstName, lastName: name.lastName } : {}),
      ...(notificationPrefs ? { notificationPrefs } : {}),
    });
    // Restore their Dosha from Supabase (or back-fill it) so it survives across devices, and
    // merge favorites (union — hearts tapped signed-out or on another device both survive).
    const [dosha] = await Promise.all([
      syncDoshaOnAuth(data.user.id, state, update),
      syncFavoritesOnAuth(data.user.id, state.favorites, update),
    ]);
    setBusy(false);
    // A member with their subscription and dosha in place has nothing to set up — straight
    // to the app. Re-running the quiz-intro/tier-confirm/notifications interstitials on every
    // sign-in was pure friction (and the notifications step could clobber saved prefs).
    if (subscription && dosha) {
      update({ completed: true, quizDone: true });
      router.replace('/home');
      return;
    }
    router.push('/quiz-intro');
  }

  // New user: create the auth account. The DB trigger creates their profile row. When email
  // confirmation is ON there's no session yet — offer resend + a "continue" that signs in
  // once they've clicked the link (previously this was a dead end).
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
      setAwaitingConfirm(true);
      setNotice('Account created! Check your inbox and click the confirmation link.');
      setBusy(false);
      return;
    }
    update({ userId: data.user?.id ?? null });
    setBusy(false);
    router.push('/profile');
  }

  // Re-send the confirmation email (short cooldown so the button can't be hammered).
  async function resendConfirmation() {
    setResendBusy(true);
    setError(null);
    const { error: resendErr } = await supabase.auth.resend({
      type: 'signup',
      email: state.email.trim(),
    });
    setResendBusy(false);
    if (resendErr) {
      setError(resendErr.message);
      return;
    }
    setNotice('Confirmation email re-sent — check your inbox (and spam folder).');
    setResendCooldown(true);
    setTimeout(() => setResendCooldown(false), 30_000);
  }

  // After the user clicks the emailed link, their credentials sign in normally — continue
  // the flow exactly where signUp with a session would have.
  async function continueAfterConfirm() {
    setBusy(true);
    setError(null);
    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email: state.email.trim(),
      password: state.password,
    });
    setBusy(false);
    if (authErr || !data.user) {
      const msg = authErr?.message ?? 'Could not sign in.';
      setError(/not confirmed/i.test(msg) ? 'Not confirmed yet — give the emailed link a minute, then try again.' : msg);
      return;
    }
    clearContentCache();
    update({ userId: data.user.id });
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

      {!awaitingConfirm ? (
        <Button
          label={primaryLabel}
          fullWidth
          size="lg"
          disabled={!valid || busy}
          onPress={migrating ? signIn : signUp}
          style={{ marginTop: 12 }}
        />
      ) : null}

      {notice ? (
        <>
          <Text italic style={{ color: fg.secondary, fontSize: 13, marginTop: 16, lineHeight: 20 }}>
            {notice}
          </Text>
          {awaitingConfirm ? (
            <>
              <Button
                label={busy ? 'Checking…' : 'I’ve confirmed — continue'}
                fullWidth
                disabled={busy || resendBusy}
                onPress={continueAfterConfirm}
                style={{ marginTop: 16 }}
              />
              <Button
                label={resendBusy ? 'Sending…' : resendCooldown ? 'Email sent' : 'Resend email'}
                variant="outline"
                size="sm"
                disabled={busy || resendBusy || resendCooldown}
                onPress={resendConfirmation}
                style={{ marginTop: 10 }}
              />
            </>
          ) : null}
        </>
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
