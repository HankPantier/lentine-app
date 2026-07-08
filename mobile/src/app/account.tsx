import { useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppHeader, Button, Eyebrow, Field, Heading, Screen, Text } from '@/components';
import { clearContentCache } from '@/lib/content-cache';
import { formatLongDate } from '@/lib/format';
import {
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationPrefs,
} from '@/lib/notification-prefs';
import { persistNotificationPrefs } from '@/lib/profile';
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
  const { hydrated } = useOnboarding();
  // The editable fields below seed local state from onboarding state once, at mount. On a
  // web reload straight onto /account that mount can beat hydration, seeding defaults over
  // the member's saved values (and a tap would then persist that wrong baseline) — so don't
  // mount the body until persisted state is in. Same gate as the splash route.
  if (!hydrated) {
    return null;
  }
  return <AccountBody />;
}

function AccountBody() {
  const router = useRouter();
  const { state, update, reset } = useOnboarding();

  const [firstName, setFirstName] = useState(state.firstName);
  const [lastName, setLastName] = useState(state.lastName);
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);

  const [email, setEmail] = useState(state.email);
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [emailErr, setEmailErr] = useState<string | null>(null);

  const [prefs, setPrefs] = useState<NotificationPrefs>(
    state.notificationPrefs ?? DEFAULT_NOTIFICATION_PREFS,
  );
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsMsg, setPrefsMsg] = useState<string | null>(null);

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

  const saveEmail = async () => {
    setEmailErr(null);
    setEmailMsg(null);
    const next = email.trim();
    if (!next.includes('@')) {
      setEmailErr('Enter a valid email');
      return;
    }
    if (next === state.email) {
      setEmailErr('That’s already your email');
      return;
    }
    setSavingEmail(true);
    // Supabase sends a confirmation link to the new address; the email only changes once
    // confirmed, so we don't update local state here — it syncs after the member confirms.
    const { error } = await supabase.auth.updateUser({ email: next });
    setSavingEmail(false);
    if (error) {
      setEmailErr(error.message);
      return;
    }
    setEmailMsg('Check your new inbox to confirm the change.');
  };

  const savePrefs = async (next: NotificationPrefs) => {
    setPrefs(next);
    update({ notificationPrefs: next });
    setPrefsMsg(null);
    if (state.userId) {
      setSavingPrefs(true);
      const { error } = await persistNotificationPrefs(state.userId, next);
      setSavingPrefs(false);
      setPrefsMsg(error ? `Couldn’t save: ${error}` : 'Saved.');
    }
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
    clearContentCache(); // cached article bodies belong to the signed-out member
    reset();
    router.replace('/');
  };

  return (
    <Screen>
      <AppHeader onBack={() => router.back()} />

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
            <>
              <Text style={{ color: fg.secondary, fontSize: 14 }}>No active subscription.</Text>
              <Button
                label="Explore membership"
                variant="outline"
                size="sm"
                onPress={() => router.push('/membership')}
                style={{ marginTop: 12 }}
              />
            </>
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

      {/* Email */}
      <Section title="Email">
        <Field
          label="Email address"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            if (emailErr) setEmailErr(null);
          }}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoComplete="email"
          autoCapitalize="none"
          error={emailErr ?? undefined}
        />
        <Button
          label={savingEmail ? 'Sending…' : 'Update email'}
          size="sm"
          disabled={savingEmail || !email.includes('@') || email.trim() === state.email}
          onPress={saveEmail}
        />
        {emailMsg ? (
          <Text italic style={{ color: fg.secondary, fontSize: 12, marginTop: 8, lineHeight: 18 }}>
            {emailMsg}
          </Text>
        ) : null}
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <Card>
          {(
            [
              { id: 'rituals', label: 'Daily rituals' },
              { id: 'recipes', label: 'New recipes' },
              { id: 'btf', label: 'Back to Forward' },
            ] as const
          ).map((p) => (
            <Pressable
              key={p.id}
              role="checkbox"
              // RN's cross-platform ARIA prop: react-native-web renders it as aria-checked
              // (accessibilityState.checked never reaches the web a11y tree); native maps it
              // back onto accessibilityState.
              aria-checked={prefs[p.id]}
              accessibilityLabel={p.label}
              disabled={savingPrefs}
              onPress={() => savePrefs({ ...prefs, [p.id]: !prefs[p.id] })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderWidth: 2,
                  borderColor: prefs[p.id] ? colors.blueLight : colors.gray,
                  backgroundColor: prefs[p.id] ? colors.blueLight : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {prefs[p.id] ? <Text style={{ color: colors.blue, fontSize: 13 }}>✓</Text> : null}
              </View>
              <Text weight="semibold" style={{ fontSize: 15, color: colors.blue }}>
                {p.label}
              </Text>
            </Pressable>
          ))}
          {prefsMsg ? (
            <Text italic style={{ color: fg.secondary, fontSize: 12, marginTop: 8 }}>
              {prefsMsg}
            </Text>
          ) : null}
        </Card>
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
