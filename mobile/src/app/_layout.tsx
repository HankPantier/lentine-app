import {
  Mulish_400Regular,
  Mulish_400Regular_Italic,
  Mulish_600SemiBold,
  Mulish_600SemiBold_Italic,
  Mulish_700Bold,
  Mulish_700Bold_Italic,
  useFonts,
} from '@expo-google-fonts/mulish';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { OnboardingProvider } from '@/onboarding/state';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

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
