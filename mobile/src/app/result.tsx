import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Button, DarkScreen, Eyebrow, Heading, OnbTopBar, Rule, Text } from '@/components';
import { useOnboarding } from '@/onboarding/state';
import { progress } from '@/onboarding/steps';
import { DOSHA } from '@/quiz/doshas';
import { computeResult, DOSHA_ORDER } from '@/quiz/scoring';
import { colors, doshaColors, fg } from '@/theme/tokens';

function Bullet({ text, accent }: { text: string; accent: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
      <Text style={{ color: accent, fontSize: 15, lineHeight: 23 }}>—</Text>
      <Text style={{ color: fg.onDarkPrimary, fontSize: 15, lineHeight: 23, flex: 1 }}>{text}</Text>
    </View>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Text weight="semibold" style={{ color: colors.white, fontSize: 17, marginTop: 24, marginBottom: 8 }}>
      {children}
    </Text>
  );
}

export default function ResultRoute() {
  const router = useRouter();
  const { state } = useOnboarding();

  const result = computeResult(state.answers);
  const key = state.dosha ?? result.primary;
  const d = DOSHA[key];
  const { tally, tie, winners } = result;
  const maxCount = Math.max(tally.vata, tally.pitta, tally.kapha, 1);
  const { current, total } = progress(state.mode, 'result');
  const next = state.mode === 'migrating' ? '/tier-confirm' : '/membership';

  return (
    <DarkScreen>
      <OnbTopBar onBack={() => router.back()} current={current} total={total} dark />

      {/* Hero */}
      <Eyebrow light color={d.accent}>
        Your leading dosha
      </Eyebrow>
      <Heading dark size={52} style={{ color: d.accent, marginTop: 8 }}>
        {d.name}
      </Heading>
      <Text
        italic
        style={{
          color: d.accent,
          fontSize: 12,
          letterSpacing: 2,
          textTransform: 'uppercase',
          marginTop: 4,
          marginBottom: 16,
        }}
      >
        {d.elements}
      </Text>
      <Rule color={d.accent} width={48} />

      {tie ? (
        <Text style={{ color: fg.onDarkSecondary, fontSize: 14, lineHeight: 22, marginTop: 20 }}>
          You&rsquo;re closely balanced — your answers landed evenly across{' '}
          {winners.map((w) => DOSHA[w].name).join(' & ')}. For now we lead with{' '}
          <Text italic style={{ color: d.accent }}>
            {d.name}
          </Text>
          .
        </Text>
      ) : null}

      <SectionTitle>{d.governs}.</SectionTitle>
      <Text style={{ color: fg.onDarkSecondary, fontSize: 15, lineHeight: 24 }}>{d.blurb}</Text>

      <SectionTitle>You at your best</SectionTitle>
      {d.balanced.map((b) => (
        <Bullet key={b} text={b} accent={d.accent} />
      ))}

      <SectionTitle>{`Signs ${d.name} is out of balance`}</SectionTitle>
      {d.imbalanced.map((b) => (
        <Bullet key={b} text={b} accent={d.accent} />
      ))}

      <SectionTitle>{`What brings ${d.name} back to center`}</SectionTitle>
      <Text style={{ color: fg.onDarkSecondary, fontSize: 15, lineHeight: 24 }}>{d.care}</Text>

      {/* Tally */}
      <View style={{ marginTop: 28, gap: 10 }}>
        {DOSHA_ORDER.map((dk) => (
          <View key={dk} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Eyebrow light color={fg.onDarkSecondary} style={{ width: 56 }}>
              {DOSHA[dk].name}
            </Eyebrow>
            <View style={{ flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.14)' }}>
              <View
                style={{
                  height: 8,
                  width: `${(tally[dk] / maxCount) * 100}%`,
                  backgroundColor: doshaColors[dk],
                }}
              />
            </View>
            <Text style={{ color: colors.white, fontSize: 13, width: 22, textAlign: 'right' }}>
              {tally[dk]}
            </Text>
          </View>
        ))}
      </View>

      <Text
        italic
        style={{
          color: fg.onDarkSecondary,
          fontSize: 12,
          lineHeight: 18,
          marginTop: 24,
        }}
      >
        This reflects your prakriti — your natural constitution — and is a starting point for
        personalizing content, not a medical diagnosis. Please don&rsquo;t self-treat based on this
        alone.
      </Text>

      <Button
        label="Continue"
        variant="ghostLight"
        size="lg"
        fullWidth
        onPress={() => router.push(next)}
        style={{ marginTop: 28 }}
      />
    </DarkScreen>
  );
}
