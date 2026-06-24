import { useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Eyebrow, Field, Heading, Screen, Text } from '@/components';
import { formatLongDate } from '@/lib/format';
import { TIER_NAME } from '@/onboarding/pricing';
import { useOnboarding } from '@/onboarding/state';
import { supabase } from '@/lib/supabase';
import { DOSHA } from '@/quiz/doshas';
import { colors, fg } from '@/theme/tokens';

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  trialing: 'Trial',
  past_due: 'Past due',
  cancelled: 'Cancelled',
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: 28 }}>
      <Eyebrow style={{ marginBottom: 12 }}>{title}</Eyebrow>
      {children}
    </View>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray, padding: 16 }}>
      {children}
    </View>
  );
}

export default function AccountRoute() {
  const router = useRouter();
  const { state, update, reset } = useOnboarding();

  const [firstName, setFirstName] = useState(state.firstName);
  const [lastName, setLastName] = useState(state.lastName);
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);

  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);

  const dosha = state.dosha ? DOSHA[state.dosha] : null;
  const sub = state.subscription;

  const saveName = async () => {
    setSavingName(true);
    setNameMsg(null);
    update({ firstName, lastName });
    const displayName = `${firstName} ${lastName}`.trim();
    if (state.userId && displayName) {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName })
        .eq('id', state.userId);
      setNameMsg(error ? `Couldn’t save: ${error.message}` : 'Saved.');
    } else {
      setNameMsg('Saved.');
    }
    setSavingName(false);
  };

  const savePassword = async () => {
    setPwErr(null);
    setPwMsg(null);
    if (pw.length < 6) {
      setPwErr('At least 6 characters');
      return;
    }
    if (pw !== pw2) {
      setPwErr('Passwords don’t match');
      return;
    }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSavingPw(false);
    if (error) {
      setPwErr(error.message);
      return;
    }
    setPw('');
    setPw2('');
    setPwMsg('Password updated.');
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    reset();
    router.replace('/');
  };

  return (
    <Screen>
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={{ marginBottom: 20 }}
      >
        <Text style={{ fontSize: 26, lineHeight: 26, color: colors.blue }}>←</Text>
      </Pressable>

      <Eyebrow>Your account</Eyebrow>
      <Heading style={{ marginTop: 8 }}>
        {state.firstName ? 'Hello, ' : 'Your '}
        <Text italic style={{ fontSize: 30, lineHeight: 35 }}>
          {state.firstName || 'account'}
        </Text>
      </Heading>
      <Text style={{ color: fg.secondary, fontSize: 14, marginTop: 6 }}>{state.email || '—'}</Text>

      {/* Dosha */}
      <Section title="Your dosha">
        <Card>
          {dosha ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: dosha.accent }} />
                <Text weight="semibold" style={{ color: colors.blue, fontSize: 18 }}>
                  {dosha.name}
                </Text>
                <Text style={{ color: fg.tertiary, fontSize: 13 }}>{dosha.elements}</Text>
              </View>
              <Text style={{ color: fg.secondary, fontSize: 14, lineHeight: 21, marginTop: 8 }}>
                {`Governs ${dosha.governs.toLowerCase()}.`}
              </Text>
              <Button
                label="Edit my answers"
                variant="outline"
                size="sm"
                onPress={() => router.push('/edit-answers')}
                style={{ marginTop: 14 }}
              />
              <Button
                label="Retake from the start"
                variant="plain"
                size="sm"
                onPress={() => router.push('/quiz-intro')}
                style={{ marginTop: 8 }}
              />
            </>
          ) : (
            <>
              <Text style={{ color: fg.secondary, fontSize: 14, lineHeight: 21 }}>
                You haven’t taken the dosha quiz yet. It takes about two minutes and personalizes
                your rituals and recipes.
              </Text>
              <Button
                label="Take the quiz"
                size="sm"
                onPress={() => router.push('/quiz-intro')}
                style={{ marginTop: 14 }}
              />
            </>
          )}
        </Card>
      </Section>

      {/* Subscription */}
      <Section title="Subscription">
        <Card>
          {sub ? (
            <>
              <Text weight="semibold" style={{ color: colors.blue, fontSize: 18 }}>
                {TIER_NAME[sub.tier]}
              </Text>
              <Text style={{ color: fg.secondary, fontSize: 14, marginTop: 6 }}>
                {`Billed ${sub.interval === 'year' ? 'yearly' : 'monthly'} · ${STATUS_LABEL[sub.status] ?? sub.status}`}
              </Text>
              <Text style={{ color: fg.secondary, fontSize: 14, marginTop: 2 }}>
                {`Renews ${formatLongDate(sub.currentPeriodEnd)}`}
              </Text>
            </>
          ) : state.tier ? (
            <>
              <Text weight="semibold" style={{ color: colors.blue, fontSize: 18 }}>
                {TIER_NAME[state.tier]}
              </Text>
              <Text style={{ color: fg.secondary, fontSize: 14, marginTop: 6 }}>
                {state.interval ? `Billed ${state.interval === 'year' ? 'yearly' : 'monthly'}` : 'Plan selected'}
              </Text>
            </>
          ) : (
            <Text style={{ color: fg.secondary, fontSize: 14 }}>No active subscription.</Text>
          )}
          <Text italic style={{ color: fg.tertiary, fontSize: 12, marginTop: 10, lineHeight: 18 }}>
            Plan changes and cancellation are coming soon.
          </Text>
        </Card>
      </Section>

      {/* Account details */}
      <Section title="Account details">
        <Field label="First name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" autoComplete="name" />
        <Field label="Last name" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
        <View style={{ marginBottom: 8 }}>
          <Eyebrow style={{ marginBottom: 6 }}>Email</Eyebrow>
          <Text style={{ color: fg.secondary, fontSize: 16 }}>{state.email || '—'}</Text>
          <Text italic style={{ color: fg.tertiary, fontSize: 12, marginTop: 4 }}>
            Email changes are coming soon.
          </Text>
        </View>
        <Button
          label={savingName ? 'Saving…' : 'Save changes'}
          size="sm"
          disabled={savingName || firstName.trim().length < 1}
          onPress={saveName}
          style={{ marginTop: 4 }}
        />
        {nameMsg ? (
          <Text italic style={{ color: fg.secondary, fontSize: 12, marginTop: 8 }}>
            {nameMsg}
          </Text>
        ) : null}
      </Section>

      {/* Security */}
      <Section title="Password">
        <Field
          label="New password"
          value={pw}
          onChangeText={(t) => {
            setPw(t);
            if (pwErr) setPwErr(null);
          }}
          secureTextEntry
          autoComplete="password"
          hint="At least 6 characters"
        />
        <Field
          label="Confirm new password"
          value={pw2}
          onChangeText={(t) => {
            setPw2(t);
            if (pwErr) setPwErr(null);
          }}
          secureTextEntry
          autoComplete="password"
          error={pwErr ?? undefined}
        />
        <Button
          label={savingPw ? 'Updating…' : 'Update password'}
          size="sm"
          disabled={savingPw || pw.length < 6 || pw !== pw2}
          onPress={savePassword}
        />
        {pwMsg ? (
          <Text italic style={{ color: fg.secondary, fontSize: 12, marginTop: 8 }}>
            {pwMsg}
          </Text>
        ) : null}
      </Section>

      {/* Sign out */}
      <View style={{ marginTop: 36, alignItems: 'center' }}>
        <Button label="Sign out" variant="outline" onPress={signOut} />
      </View>
    </Screen>
  );
}
