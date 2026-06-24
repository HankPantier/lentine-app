import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Button, Eyebrow, Heading, Screen, Text, Wordmark } from '@/components';
import { TIER_NAME } from '@/onboarding/pricing';
import { useOnboarding } from '@/onboarding/state';
import { DOSHA } from '@/quiz/doshas';
import type { DoshaKey } from '@/quiz/types';
import { colors, fg } from '@/theme/tokens';

const RITUAL: Record<DoshaKey, { title: string; meta: string }> = {
  vata: { title: 'Warm oil self-massage', meta: '8 min · grounding' },
  pitta: { title: 'Cooling breath by a window', meta: '5 min · soothing' },
  kapha: { title: 'Brisk morning walk', meta: '15 min · energizing' },
};

const RECIPE: Record<DoshaKey, { title: string; meta: string }> = {
  vata: { title: 'Golden spiced oatmeal', meta: 'Warm · nourishing · easy' },
  pitta: { title: 'Cucumber-mint cooler bowl', meta: 'Fresh · cooling · light' },
  kapha: { title: 'Ginger lentil soup', meta: 'Spiced · light · warming' },
};

const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000; // re-show the quiz nudge ~3 days after dismissal

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray, padding: 18 }}>
      {children}
    </View>
  );
}

export default function HomeRoute() {
  const router = useRouter();
  const { state, update } = useOnboarding();
  const hasDosha = state.dosha != null;
  const key = state.dosha ?? 'vata';
  const d = DOSHA[key];
  const first = state.firstName || 'friend';

  // Nudge un-quizzed users to take the dosha quiz, but only every few days once dismissed.
  const showQuizNudge =
    !hasDosha &&
    (state.quizNudgeDismissedAt == null || Date.now() - state.quizNudgeDismissedAt > SNOOZE_MS);

  return (
    <Screen padding={0}>
      {/* Hero */}
      <View style={{ backgroundColor: colors.blue, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 32 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Wordmark width={130} />
          <Pressable
            onPress={() => router.push('/account')}
            accessibilityRole="button"
            accessibilityLabel="Account"
            hitSlop={10}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: d.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text weight="bold" style={{ color: colors.blue, fontSize: 14 }}>
              {first.charAt(0).toUpperCase()}
            </Text>
          </Pressable>
        </View>
        <Eyebrow light color={colors.blueLight} style={{ marginTop: 24 }}>
          {`${greeting()}, ${first}`}
        </Eyebrow>
        <Heading dark size={30} style={{ marginTop: 8 }}>
          {hasDosha ? (
            <>
              Your{' '}
              <Text italic style={{ color: d.accent, fontSize: 30, lineHeight: 35 }}>
                {d.name}
              </Text>{' '}
              day begins
            </>
          ) : (
            <>
              Your day{' '}
              <Text italic style={{ color: colors.blueLight, fontSize: 30, lineHeight: 35 }}>
                begins
              </Text>
            </>
          )}
        </Heading>
      </View>

      <View style={{ padding: 24, gap: 20 }}>
        {/* Dosha-quiz nudge (dismissible) */}
        {showQuizNudge ? (
          <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.blueLight, padding: 18 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Eyebrow color={colors.blueBright} style={{ marginBottom: 6 }}>
                Discover your dosha
              </Eyebrow>
              <Pressable
                onPress={() => update({ quizNudgeDismissedAt: Date.now() })}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Dismiss"
              >
                <Text style={{ color: fg.tertiary, fontSize: 18, lineHeight: 18 }}>✕</Text>
              </Pressable>
            </View>
            <Text style={{ color: fg.secondary, fontSize: 14, lineHeight: 21 }}>
              Take the 2-minute quiz so your rituals and recipes are tailored to you.
            </Text>
            <Button
              label="Take the quiz"
              size="sm"
              onPress={() => router.push('/quiz-intro')}
              style={{ marginTop: 14 }}
            />
          </View>
        ) : null}

        <View>
          <Eyebrow style={{ marginBottom: 8 }}>Today&rsquo;s ritual</Eyebrow>
          <Card>
            <Text weight="semibold" style={{ fontSize: 17, color: colors.blue }}>
              {RITUAL[key].title}
            </Text>
            <Text style={{ color: fg.secondary, fontSize: 13, marginTop: 4 }}>{RITUAL[key].meta}</Text>
          </Card>
        </View>

        <View>
          <Eyebrow style={{ marginBottom: 8 }}>
            {hasDosha ? `Made for your ${d.name}` : 'Today’s recipe'}
          </Eyebrow>
          <Card>
            <Text weight="semibold" style={{ fontSize: 17, color: colors.blue }}>
              {RECIPE[key].title}
            </Text>
            <Text style={{ color: fg.secondary, fontSize: 13, marginTop: 4 }}>{RECIPE[key].meta}</Text>
          </Card>
        </View>

        <View style={{ backgroundColor: colors.blue, padding: 18 }}>
          <Eyebrow light color={colors.blueLight} style={{ marginBottom: 6 }}>
            {state.tier ? TIER_NAME[state.tier] : 'Your membership'}
          </Eyebrow>
          <Text style={{ color: colors.white, fontSize: 15, lineHeight: 23 }}>
            This month in Back to Forward: settling the nervous system, one small practice at a time.
          </Text>
        </View>

        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <Button label="Account & settings" variant="plain" onPress={() => router.push('/account')} />
        </View>
      </View>
    </Screen>
  );
}
