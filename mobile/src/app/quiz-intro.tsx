import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Button, Eyebrow, Heading, OnbTopBar, Screen, Text } from '@/components';
import { useOnboarding } from '@/onboarding/state';
import { progress } from '@/onboarding/steps';
import { DOSHA } from '@/quiz/doshas';
import type { DoshaKey } from '@/quiz/types';
import { colors, fg } from '@/theme/tokens';

const ORDER: DoshaKey[] = ['vata', 'pitta', 'kapha'];

export default function QuizIntroRoute() {
  const router = useRouter();
  const { state } = useOnboarding();
  const { current, total } = progress(state.mode, 'quiz_intro');

  // "Skip for now" advances past the quiz (and the result screen, which needs a dosha) into
  // the rest of onboarding. The dosha stays unset until they take it later.
  const skip = () => {
    router.push(state.mode === 'migrating' ? '/tier-confirm' : '/tier');
  };

  return (
    <Screen>
      <OnbTopBar onBack={() => router.back()} current={current} total={total} />
      <Eyebrow>The Dosha quiz</Eyebrow>
      <Heading style={{ marginTop: 8, marginBottom: 16 }}>
        Discover your{' '}
        <Text italic style={{ fontSize: 30, lineHeight: 35 }}>
          dosha
        </Text>
      </Heading>

      <Text style={{ color: fg.secondary, fontSize: 15, lineHeight: 23, marginBottom: 16 }}>
        In Ayurveda, three doshas — Vata, Pitta, and Kapha — describe the energies that shape
        your body and mind. Most of us lead with one.
      </Text>

      <View style={{ gap: 8, marginBottom: 20 }}>
        {ORDER.map((k) => (
          <View
            key={k}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              backgroundColor: colors.white,
              borderWidth: 1,
              borderColor: colors.gray,
              paddingVertical: 12,
              paddingHorizontal: 14,
            }}
          >
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: DOSHA[k].accent }} />
            <Text weight="semibold" style={{ color: colors.blue, fontSize: 15 }}>
              {DOSHA[k].name}
            </Text>
            <Text style={{ color: fg.tertiary, fontSize: 13 }}>{DOSHA[k].elements}</Text>
          </View>
        ))}
      </View>

      <Text style={{ color: fg.secondary, fontSize: 15, lineHeight: 23, marginBottom: 8 }}>
        Twelve quick questions reveal your unique balance, so Lentine can tailor your daily
        rituals, recipes, and guidance to you.
      </Text>
      <Text style={{ color: fg.secondary, fontSize: 15, lineHeight: 23, marginBottom: 24 }}>
        It takes about two minutes — and you can skip for now and take it anytime later from
        your profile.
      </Text>

      <Button
        label="Begin the quiz"
        fullWidth
        size="lg"
        onPress={() => router.push('/quiz')}
      />

      <Pressable
        accessibilityRole="button"
        onPress={skip}
        style={{ marginTop: 20, alignSelf: 'flex-start' }}
      >
        <Text
          italic
          style={{
            color: colors.blue,
            fontSize: 13,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            textDecorationLine: 'underline',
          }}
        >
          Skip for now — take it later from your profile
        </Text>
      </Pressable>
    </Screen>
  );
}
