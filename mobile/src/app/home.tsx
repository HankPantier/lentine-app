import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { AppHeader, ArticleCard, Button, Eyebrow, Heading, Screen, Text } from '@/components';
import { DOSHA_CONTENT } from '@/content/dosha-content';
import { setArticlePreview } from '@/lib/article-preview';
import { type Article, fetchArticles } from '@/lib/articles';
import { canAccess, entitledTier } from '@/lib/entitlement';
import { formatLongDate } from '@/lib/format';
import { TIER_NAME } from '@/onboarding/pricing';
import { useOnboarding } from '@/onboarding/state';
import { DOSHA } from '@/quiz/doshas';
import { colors, fg } from '@/theme/tokens';

const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000; // re-show the quiz nudge ~3 days after dismissal

/** Ways to order the "Latest from Lentine" feed in-app. All items stay visible; only order changes. */
type SortMode = 'recent' | 'type' | 'category';
const SORTS: { key: SortMode; label: string }[] = [
  { key: 'recent', label: 'Recent' },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
];

/** Pure, deterministic sort of the merged posts+recipes feed; ties always fall back to newest-first. */
function sortArticles(list: Article[], mode: SortMode): Article[] {
  const byDateDesc = (a: Article, b: Article) => b.date.localeCompare(a.date);
  const copy = list.slice();
  if (mode === 'type') {
    return copy.sort((a, b) => (a.type === b.type ? byDateDesc(a, b) : a.type.localeCompare(b.type)));
  }
  if (mode === 'category') {
    return copy.sort((a, b) => {
      const ca = a.category ?? '~'; // nulls sort last
      const cb = b.category ?? '~';
      return ca === cb ? byDateDesc(a, b) : ca.localeCompare(cb);
    });
  }
  return copy.sort(byDateDesc);
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  trialing: 'Trial',
  past_due: 'Past due',
  cancelled: 'Cancelled',
};

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
  const sub = state.subscription;

  // Snapshot "now" once per mount (a lazy initializer keeps render pure — no Date.now() call
  // on every render). Millisecond precision isn't needed for a multi-day snooze window.
  const [now] = useState(() => Date.now());

  // Latest WordPress articles (posts + recipes). null = still loading; [] = genuinely empty.
  // A failed load is its own state (with a retry) — an API error must not read as "no content".
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [feedFailed, setFeedFailed] = useState(false);
  const [feedAttempt, setFeedAttempt] = useState(0);
  const [sort, setSort] = useState<SortMode>('recent');
  useEffect(() => {
    let active = true;
    fetchArticles(12).then(
      (a) => {
        if (!active) return;
        setArticles(a);
        setFeedFailed(false);
      },
      () => active && setFeedFailed(true),
    );
    return () => {
      active = false;
    };
  }, [feedAttempt]);
  const retryFeed = () => {
    setFeedFailed(false);
    setArticles(null);
    setFeedAttempt((n) => n + 1);
  };

  // The tier that currently unlocks bodies (null unless an active/trialing subscription). Drives
  // the instant lock badges; the wp-articles edge function re-verifies the same rule server-side.
  const tier = entitledTier(sub);
  const sortedArticles = useMemo(() => (articles ? sortArticles(articles, sort) : null), [articles, sort]);

  // Nudge un-quizzed users to take the dosha quiz, but only every few days once dismissed.
  const showQuizNudge =
    !hasDosha && (state.quizNudgeDismissedAt == null || now - state.quizNudgeDismissedAt > SNOOZE_MS);

  return (
    <Screen padding={0}>
      {/* Hero */}
      <View style={{ backgroundColor: colors.blue, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 32 }}>
        <AppHeader
          logo
          dark
          right={
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
          }
        />
        {/* AppHeader owns 20px of the gap; 4 more keeps the hero rhythm at the original 24. */}
        <Eyebrow light color={colors.blueLight} style={{ marginTop: 4 }}>
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

        {/* Today teaser → the dosha content landing */}
        <View>
          <Eyebrow style={{ marginBottom: 8 }}>{hasDosha ? `Today, for your ${d.name}` : 'Today'}</Eyebrow>
          <Pressable onPress={() => router.push('/today')} accessibilityRole="button" accessibilityLabel="Open today">
            <Card>
              <Text style={{ color: colors.blue, fontSize: 15, lineHeight: 23 }}>
                {hasDosha
                  ? DOSHA_CONTENT[key].focus
                  : 'Your rituals and recipes appear here once you’ve found your dosha.'}
              </Text>
              <Text
                italic
                style={{
                  color: colors.blueBright,
                  fontSize: 13,
                  marginTop: 12,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                }}
              >
                See today →
              </Text>
            </Card>
          </Pressable>
        </View>

        {/* Latest from Lentine — real posts + recipes pulled from WordPress */}
        <View>
          <Eyebrow style={{ marginBottom: 8 }}>Latest from Lentine</Eyebrow>
          {feedFailed ? (
            <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray, padding: 18 }}>
              <Text style={{ color: fg.secondary, fontSize: 14, lineHeight: 21 }}>
                Couldn&rsquo;t load articles right now.
              </Text>
              <Button label="Try again" size="sm" onPress={retryFeed} style={{ marginTop: 12 }} />
            </View>
          ) : sortedArticles === null ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator color={colors.blue} />
            </View>
          ) : sortedArticles.length === 0 ? (
            <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray, padding: 18 }}>
              <Text style={{ color: fg.secondary, fontSize: 14 }}>Nothing published just yet — check back soon.</Text>
            </View>
          ) : (
            <>
              {sortedArticles.length > 1 ? (
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  {SORTS.map((s) => {
                    const selected = sort === s.key;
                    return (
                      <Pressable
                        key={s.key}
                        onPress={() => setSort(s.key)}
                        accessibilityRole="button"
                        accessibilityLabel={`Sort by ${s.label}`}
                        accessibilityState={{ selected }}
                        style={{
                          paddingVertical: 6,
                          paddingHorizontal: 12,
                          borderWidth: 1,
                          borderColor: selected ? colors.blue : colors.gray,
                          backgroundColor: selected ? colors.blue : colors.white,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            letterSpacing: 0.5,
                            textTransform: 'uppercase',
                            color: selected ? colors.white : fg.secondary,
                          }}
                        >
                          {s.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
              <View style={{ gap: 14 }}>
                {sortedArticles.map((a) => (
                  <ArticleCard
                    key={a.id}
                    article={a}
                    locked={!canAccess(a, tier)}
                    onPress={() => {
                      // The reader paints instantly from this summary while the body loads.
                      setArticlePreview(a);
                      router.push({ pathname: '/articles/[slug]', params: { slug: a.slug } });
                    }}
                  />
                ))}
              </View>
            </>
          )}
        </View>

        {/* Membership — the member's real subscription (returning members) or selected plan */}
        <View style={{ backgroundColor: colors.blue, padding: 18 }}>
          <Eyebrow light color={colors.blueLight} style={{ marginBottom: 6 }}>
            Your membership
          </Eyebrow>
          {sub ? (
            <>
              <Text weight="semibold" style={{ color: colors.white, fontSize: 17 }}>
                {TIER_NAME[sub.tier]}
              </Text>
              <Text style={{ color: fg.onDarkSecondary, fontSize: 14, marginTop: 4 }}>
                {`Billed ${sub.interval === 'year' ? 'yearly' : 'monthly'} · ${STATUS_LABEL[sub.status] ?? sub.status}`}
              </Text>
              <Text style={{ color: fg.onDarkSecondary, fontSize: 14, marginTop: 2 }}>
                {`Renews ${formatLongDate(sub.currentPeriodEnd)}`}
              </Text>
            </>
          ) : state.tier ? (
            <>
              <Text weight="semibold" style={{ color: colors.white, fontSize: 17 }}>
                {TIER_NAME[state.tier]}
              </Text>
              <Text style={{ color: fg.onDarkSecondary, fontSize: 14, marginTop: 4 }}>
                {state.interval ? `Billed ${state.interval === 'year' ? 'yearly' : 'monthly'}` : 'Plan selected'}
              </Text>
            </>
          ) : (
            <>
              <Text style={{ color: fg.onDarkSecondary, fontSize: 14 }}>No active subscription.</Text>
              {!state.userId ? (
                <Button
                  label="Already a member? Sign in"
                  variant="ghostLight"
                  size="sm"
                  onPress={() => {
                    update({ mode: 'migrating' });
                    router.push('/signup');
                  }}
                  style={{ marginTop: 12 }}
                />
              ) : null}
              <Button
                label="Explore membership"
                variant="ghostLight"
                size="sm"
                onPress={() => router.push('/membership')}
                style={{ marginTop: state.userId ? 12 : 8 }}
              />
            </>
          )}
        </View>

        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <Button label="Account & settings" variant="plain" onPress={() => router.push('/account')} />
        </View>
      </View>
    </Screen>
  );
}
