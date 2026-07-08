import {
  Mulish_400Regular,
  Mulish_400Regular_Italic,
  Mulish_600SemiBold,
  Mulish_600SemiBold_Italic,
  Mulish_700Bold,
  Mulish_700Bold_Italic,
  useFonts,
} from '@expo-google-fonts/mulish';
import * as Linking from 'expo-linking';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { OnboardingProvider, useOnboarding } from '@/onboarding/state';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

// Recovery links carry the session tokens in the URL fragment (or query).
function paramsFromUrl(url: string): URLSearchParams {
  const hash = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0] : '';
  return new URLSearchParams(hash || query);
}

/**
 * Routes a password-recovery link to /set-password on every platform (per the cross-platform
 * rule). Web: the Supabase client auto-parses the fragment and fires PASSWORD_RECOVERY.
 * Native: detectSessionInUrl is off, so we parse the deep link and set the session ourselves.
 * Also clears persisted auth when the session dies mid-use (token revoked/expired) so the
 * sign-in CTAs reappear — startup reconciliation lives in the OnboardingProvider.
 */
function AuthListener() {
  const router = useRouter();
  const { update } = useOnboarding();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.replace('/set-password');
      }
      if (event === 'SIGNED_OUT') {
        // Harmless duplicate after the account screen's reset(); essential when the
        // session is revoked/expired without an explicit sign-out.
        update({ userId: null, subscription: null });
      }
    });
    return () => data.subscription.unsubscribe();
  }, [router, update]);

  const url = Linking.useURL();
  useEffect(() => {
    if (Platform.OS === 'web' || !url) return;
    const sp = paramsFromUrl(url);
    const access_token = sp.get('access_token');
    const refresh_token = sp.get('refresh_token');
    if (!access_token || !refresh_token) return;
    let active = true;
    supabase.auth.setSession({ access_token, refresh_token }).then(() => {
      if (active && sp.get('type') === 'recovery') router.replace('/set-password');
    });
    return () => {
      active = false;
    };
  }, [url, router]);

  return null;
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Mulish_400Regular,
    Mulish_400Regular_Italic,
    Mulish_600SemiBold,
    Mulish_600SemiBold_Italic,
    Mulish_700Bold,
    Mulish_700Bold_Italic,
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <OnboardingProvider>
      <AuthListener />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.taupe },
          animation: 'fade',
        }}
      />
    </OnboardingProvider>
  );
}
