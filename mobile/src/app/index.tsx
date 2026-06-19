import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { Button, DarkScreen, Eyebrow, Rule, Text, Wordmark } from '@/components';
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

  // Wait for persisted state to load so we don't flash the splash to a returning user.
  if (!hydrated || state.completed) {
    return null;
  }

  const begin = () => {
    update({ mode: 'new' });
    router.push('/signup');
  };

  const signIn = () => {
    // M1: the migrating-user branch (real login/reset) lands in M2. For now the
    // existing-member path runs through the same mocked flow.
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
