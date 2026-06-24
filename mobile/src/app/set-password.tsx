import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, Eyebrow, Field, Heading, Screen, Text } from '@/components';
import { syncDoshaOnAuth } from '@/lib/profile';
import { supabase } from '@/lib/supabase';
import { fetchSubscription } from '@/lib/subscription';
import { useOnboarding } from '@/onboarding/state';
import { fg } from '@/theme/tokens';

/**
 * Reached from a password-recovery link (a migrated member's first login, or a forgot-
 * password). The recovery session is established before we land here — on web by the
 * Supabase client (detectSessionInUrl), on native by app/_layout.tsx parsing the deep link.
 * We just collect the new password and continue as a returning member.
 */
export default function SetPasswordRoute() {
  const router = useRouter();
  const { state, update } = useOnboarding();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = password.length >= 6 && password === confirm;

  async function save() {
    setBusy(true);
    setError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setError('This reset link has expired. Request a new one from the sign-in screen.');
      setBusy(false);
      return;
    }

    const { data, error: updErr } = await supabase.auth.updateUser({ password });
    if (updErr || !data.user) {
      setError(updErr?.message ?? 'Could not set your password.');
      setBusy(false);
      return;
    }

    // They're now a signed-in returning member — pull their subscription for tier-confirm.
    update({
      mode: 'migrating',
      userId: data.user.id,
      email: data.user.email ?? '',
      subscription: await fetchSubscription(data.user.id),
    });
    // Restore their Dosha from Supabase (or back-fill it) so it survives across devices.
    await syncDoshaOnAuth(data.user.id, state, update);
    setBusy(false);
    router.replace('/quiz-intro');
  }

  return (
    <Screen>
      <Eyebrow>Set your password</Eyebrow>
      <Heading style={{ marginTop: 8, marginBottom: 8 }}>
        Choose a{' '}
        <Text italic style={{ fontSize: 30, lineHeight: 35 }}>
          password
        </Text>
      </Heading>
      <Text style={{ color: fg.secondary, fontSize: 15, lineHeight: 23, marginBottom: 20 }}>
        Welcome back. Set a password to finish signing in — your subscription carried over.
      </Text>

      <Field
        label="New password"
        value={password}
        onChangeText={(t) => {
          setPassword(t);
          if (error) setError(null);
        }}
        secureTextEntry
        autoComplete="password"
        hint="At least 6 characters"
      />
      <Field
        label="Confirm password"
        value={confirm}
        onChangeText={(t) => {
          setConfirm(t);
          if (error) setError(null);
        }}
        secureTextEntry
        autoComplete="password"
        error={confirm.length > 0 && password !== confirm ? 'Passwords don’t match' : (error ?? undefined)}
      />

      <Button
        label={busy ? 'Saving…' : 'Set password & continue'}
        fullWidth
        size="lg"
        disabled={!valid || busy}
        onPress={save}
        style={{ marginTop: 12 }}
      />
    </Screen>
  );
}
