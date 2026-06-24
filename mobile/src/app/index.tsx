import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { Button, DarkScreen, Eyebrow, Rule, Text, Wordmark } from '@/components';
import { supabase } from '@/lib/supabase';
import { useOnboarding } from '@/onboarding/state';
import { colors, fg } from '@/theme/tokens';

export default function SplashRoute() {
  const router = useRouter();
  const { state, hydrated, update } = useOnboarding();

  // Resume: a user who already finished onboarding skips the splash and lands on home.
  useEffect(() => {
    if (hydrated && state.completed) {
      router.replace('/home');
    }
  }, [hydrated, state.completed, router]);

  // Restore the Supabase user id into onboarding state if a session is still active
  // (e.g. after a reload) but state was cleared. Doesn't force navigation on its own.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session && !state.userId) {
        update({ userId: data.session.user.id });
      }
    });
    return () => {
      active = false;
    };
  }, [state.userId, update]);

  // Wait for persisted state to load so we don't flash the splash to a returning user.
  if (!hydrated || state.completed) {
    return null;
  }

  const begin = () => {
    update({ mode: 'new' });
    router.push('/signup');
  };

  const signIn = () => {
    // Returning member: real Supabase sign-in / first-login set-password on the next screen.
    update({ mode: 'migrating' });
    router.push('/signup');
  };

  return (
    <DarkScreen scroll={false} contentStyle={{ justifyContent: 'space-between', paddingVertical: 48 }}>
      <View>
        <Eyebrow light color={colors.blueLight}>
          Welcome
        </Eyebrow>
        <View style={{ marginTop: 24, marginBottom: 20 }}>
          <Wordmark width={210} />
        </View>
        <Rule color={colors.blueLight} width={48} />
        <Text style={{ color: colors.white, fontSize: 40, lineHeight: 46, marginTop: 24 }}>
          Balanced, purposeful{' '}
          <Text italic style={{ color: colors.blueLight, fontSize: 40, lineHeight: 46 }}>
            + joyful
          </Text>
        </Text>
        <Text
          style={{
            color: fg.onDarkSecondary,
            fontSize: 16,
            lineHeight: 26,
            marginTop: 20,
            maxWidth: 360,
          }}
        >
          Ayurvedic guidance, gentle rituals, and recipes — shaped around your unique
          constitution. Let&rsquo;s find where you begin.
        </Text>
      </View>

      <View style={{ gap: 16 }}>
        <Button label="Begin your journey" variant="ghostLight" size="lg" fullWidth onPress={begin} />
        <View style={{ alignItems: 'center' }}>
          <Button label="Already a member? Sign in" variant="plain" onPress={signIn} />
        </View>
      </View>
    </DarkScreen>
  );
}
