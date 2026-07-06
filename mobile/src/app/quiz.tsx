import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Eyebrow, Heading, OnbTopBar, OptionCard, Screen, Text } from '@/components';
import { persistDosha } from '@/lib/profile';
import { useOnboarding } from '@/onboarding/state';
import { progress } from '@/onboarding/steps';
import { DOSHA } from '@/quiz/doshas';
import { QUESTIONS } from '@/quiz/questions';
import { computeResult, quizProgressPct } from '@/quiz/scoring';
import type { DoshaKey } from '@/quiz/types';
import { colors, fg } from '@/theme/tokens';

export default function QuizRoute() {
  const router = useRouter();
  const { state, setAnswer, update } = useOnboarding();
  const [current, setCurrent] = useState(0);

  const onb = progress(state.mode, 'quiz');
  const total = QUESTIONS.length;
  const q = QUESTIONS[current];
  const selected = state.answers[current];
  const isLast = current === total - 1;

  const onBack = () => {
    if (current === 0) {
      router.back();
    } else {
      setCurrent((c) => c - 1);
    }
  };

  const onNext = () => {
    if (!selected) return;
    if (!isLast) {
      setCurrent((c) => c + 1);
      return;
    }
    const result = computeResult(state.answers);
    const takenAt = new Date().toISOString();
    update({
      dosha: result.primary,
      doshaScores: result.tally,
      doshaTakenAt: takenAt,
      quizDone: true,
    });
    // Capture the result in Supabase when signed in. Fire-and-forget: a brand-new user with
    // email confirmation still pending has no session, so the reconcile-on-auth pass backfills
    // it on their next sign-in (see syncDoshaOnAuth).
    if (state.userId) {
      persistDosha(state.userId, result.primary, result.tally, takenAt, state.answers).then(({ error }) => {
        if (error) console.warn('[dosha] save failed:', error);
      });
    }
    router.push('/result');
  };

  return (
    <Screen>
      <OnbTopBar onBack={onBack} current={onb.current} total={onb.total} />

      {/* Per-question progress */}
      <View style={{ marginBottom: 24 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <Eyebrow>{`Question ${current + 1} of ${total}`}</Eyebrow>
          <Eyebrow color={fg.tertiary}>{q.cat}</Eyebrow>
        </View>
        <View style={{ height: 3, backgroundColor: colors.gray }}>
          <View
            style={{
              height: 3,
              width: `${quizProgressPct(current, total)}%`,
              backgroundColor: colors.blueLight,
            }}
          />
        </View>
      </View>

      <Heading size={24} style={{ marginBottom: 24 }}>
        {q.q}
      </Heading>

      <View style={{ gap: 12 }}>
        {q.a.map((opt, i) => (
          <OptionCard
            key={i}
            label={opt.t}
            selected={selected === opt.d}
            onPress={() => setAnswer(current, opt.d as DoshaKey)}
          />
        ))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 28 }}>
        <Button label="Back" variant="outline" onPress={onBack} />
        <View style={{ flex: 1 }} />
        <Button label={isLast ? 'See my result' : 'Next'} disabled={!selected} onPress={onNext} />
      </View>

      {/* Tiny reassurance, mirroring the prototype's framing */}
      <Text italic style={{ color: fg.tertiary, fontSize: 12, marginTop: 20, lineHeight: 18 }}>
        Choose what&rsquo;s been most true across your life — your {DOSHA.vata.name.toLowerCase()}/
        {DOSHA.pitta.name.toLowerCase()}/{DOSHA.kapha.name.toLowerCase()} baseline, not just today.
      </Text>
    </Screen>
  );
}
