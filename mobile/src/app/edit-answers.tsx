import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AppHeader, Button, Eyebrow, Heading, OptionCard, Screen, Text } from '@/components';
import { persistDosha } from '@/lib/profile';
import { useOnboarding } from '@/onboarding/state';
import { DOSHA } from '@/quiz/doshas';
import { QUESTIONS } from '@/quiz/questions';
import { computeResult } from '@/quiz/scoring';
import type { Answer, DoshaKey } from '@/quiz/types';
import { fg } from '@/theme/tokens';

/**
 * Edit the saved dosha answers. Seeded from a local copy of state.answers so backing out
 * cancels cleanly; only Save commits — recomputes the result and writes the full result +
 * answers to Supabase (when signed in), mirroring the quiz-completion path.
 */
export default function EditAnswersRoute() {
  const router = useRouter();
  const { state, update } = useOnboarding();

  const [answers, setAnswers] = useState<Answer[]>(() => state.answers.slice());
  const [saving, setSaving] = useState(false);

  const allAnswered = answers.every((a) => a != null);
  const preview = allAnswered ? computeResult(answers) : null;

  const setAt = (index: number, value: DoshaKey) =>
    setAnswers((prev) => {
      const next = prev.slice();
      next[index] = value;
      return next;
    });

  const onSave = async () => {
    if (!allAnswered || saving) return;
    setSaving(true);
    const result = computeResult(answers);
    const takenAt = new Date().toISOString();
    update({
      dosha: result.primary,
      doshaScores: result.tally,
      doshaTakenAt: takenAt,
      answers,
      quizDone: true,
    });
    if (state.userId) {
      const { error } = await persistDosha(state.userId, result.primary, result.tally, takenAt, answers);
      if (error) console.warn('[dosha] edit save failed:', error);
    }
    setSaving(false);
    router.back();
  };

  return (
    <Screen>
      <AppHeader onBack={() => router.back()} />

      <Eyebrow>Your dosha</Eyebrow>
      <Heading style={{ marginTop: 8 }}>
        Edit your{' '}
        <Text italic style={{ fontSize: 30, lineHeight: 35 }}>
          answers
        </Text>
      </Heading>
      <Text style={{ color: fg.secondary, fontSize: 15, lineHeight: 23, marginTop: 12, marginBottom: 8 }}>
        Change any answer and we&rsquo;ll recalculate your dosha when you save.
      </Text>

      {QUESTIONS.map((q, i) => (
        <View key={i} style={{ marginTop: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Eyebrow>{`Question ${i + 1}`}</Eyebrow>
            <Eyebrow color={fg.tertiary}>{q.cat}</Eyebrow>
          </View>
          <Heading size={19} style={{ marginBottom: 12 }}>
            {q.q}
          </Heading>
          <View style={{ gap: 10 }}>
            {q.a.map((opt, j) => (
              <OptionCard
                key={j}
                label={opt.t}
                selected={answers[i] === opt.d}
                onPress={() => setAt(i, opt.d as DoshaKey)}
              />
            ))}
          </View>
        </View>
      ))}

      <View style={{ marginTop: 28 }}>
        {preview ? (
          <Text style={{ color: fg.secondary, fontSize: 14, marginBottom: 12 }}>
            Your result:{' '}
            <Text italic weight="semibold" style={{ color: DOSHA[preview.primary].accent, fontSize: 14 }}>
              {DOSHA[preview.primary].name}
            </Text>
          </Text>
        ) : (
          <Text italic style={{ color: fg.tertiary, fontSize: 13, marginBottom: 12, lineHeight: 19 }}>
            Answer all {QUESTIONS.length} questions to save.
          </Text>
        )}
        <Button
          label={saving ? 'Saving…' : 'Save answers'}
          fullWidth
          size="lg"
          disabled={!allAnswered || saving}
          onPress={onSave}
        />
      </View>
    </Screen>
  );
}
