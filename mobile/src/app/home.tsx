import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { AppHeader, ArticleCard, Button, Eyebrow, Heading, Screen, Text } from '@/components';
import { DOSHA_CONTENT } from '@/content/dosha-content';
import { setArticlePreview } from '@/lib/article-preview';
import { type Article, fetchArticles } from '@/lib/articles';
import { canAccess, entitledTier } from '@/lib/entitlement';
import { applyFeedFilter, type FeedFilter, feedCategories } from '@/lib/feed-filters';
import { splitByDosha } from '@/lib/feed-sections';
import { formatLongDate } from '@/lib/format';
import { TIER_NAME } from '@/onboarding/pricing';
import { useOnboarding } from '@/onboarding/state';
import { DOSHA } from '@/quiz/doshas';
import { colors, fg } from '@/theme/tokens';

const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000; // re-show the quiz nudge ~3 days after dismissal

/** Newest-first — the feed's one and only order. Narrowing happens via filters, not sorts. */
function byDateDesc(list: Article[]): Article[] {
  return list.slice().sort((a, b) => b.date.localeCompare(a.date));
}

/** Which chip group's value row is open. Recent = no group (and resets the filter). */
type ChipGroup = 'type' | 'category' | null;

/** The Type group's values: content types first, then the dosha list. */
const TYPE_VALUES: { label: string; filter: FeedFilter }[] = [
  { label: 'Articles', filter: { kind: 'type', value: 'post' } },
  { label: 'Recipes', filter: { kind: 'type', value: 'recipe' } },
  { label: 'Vata', filter: { kind: 'dosha', value: 'vata' } },
  { label: 'Pitta', filter: { kind: 'dosha', value: 'pitta' } },
  { label: 'Kapha', filter: { kind: 'dosha', value: 'kapha' } },
];

function sameFilter(a: FeedFilter, b: FeedFilter): boolean {
  if (a.kind !== b.kind) return false;
  return a.kind === 'all' || (a as { value: string }).value === (b as { value: string }).value;
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

/** One feed filter chip — the same navy-when-selected pill for group and value rows. */
function Chip({
  label,
  selected,
  a11y,
  onPress,
}: {
  label: string;
  selected: boolean;
  a11y: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
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
        {label}
      </Text>
    </Pressable>
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
  const [filter, setFilter] = useState<FeedFilter>({ kind: 'all' });
  const [chipGroup, setChipGroup] = useState<ChipGroup>(null);
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

  // Dosha-matched items surface in their own "For your <Dosha>" section (fixed newest-first,
  // flagged), the rest flows to "More from Lentine" where the filter chips apply. No dosha or
  // no matches -> the original flat "Latest from Lentine" list.
  const { matched, rest } = useMemo(
    () => splitByDosha(articles ?? [], state.dosha),
    [articles, state.dosha],
  );
  const sectioned = matched.length > 0;
  const sortedMatched = useMemo(() => byDateDesc(matched), [matched]);
  /** The chip-filterable pool: the More section when sectioned, else the whole feed. */
  const restPool = useMemo(
    () => (articles ? byDateDesc(sectioned ? rest : articles) : null),
    [articles, sectioned, rest],
  );
  const filteredRest = useMemo(
    () => (restPool ? applyFeedFilter(restPool, filter) : null),
    [restPool, filter],
  );
  const categories = useMemo(() => feedCategories(restPool ?? []), [restPool]);

  // Chip taps. Recent resets; picking an already-selected value toggles back to everything.
  const pickFilter = (f: FeedFilter) => setFilter((cur) => (sameFilter(cur, f) ? { kind: 'all' } : f));
  const chipValues = chipGroup === 'type'
    ? TYPE_VALUES
    : chipGroup === 'category'
      ? categories.map((c) => ({ label: c, filter: { kind: 'category', value: c } as FeedFilter }))
      : [];

  const openArticle = (a: Article) => {
    // The reader paints instantly from this summary while the body loads.
    setArticlePreview(a);
    router.push({ pathname: '/articles/[slug]', params: { slug: a.slug } });
  };

  // Nudge un-quizzed users to take the dosha quiz, but only every few days once dismissed.
  const showQuizNudge =
    !hasDosha && (state.quizNudgeDismissedAt == null || now - state.quizNudgeDismissedAt > SNOOZE_MS);

  return (
    <Screen padding={0}>
      {/* Hero */}
      <View style={{ backgroundColor: colors.blue, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 32 }}>
        {/* No onBack -> wordmark left; the default right slot is the account avatar. */}
        <AppHeader dark />
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

        {/* Latest from Lentine — real posts + recipes pulled from WordPress. Items matching
            the member's dosha lead in their own flagged section; the rest goes compact. */}
        <View>
          {feedFailed ? (
            <>
              <Eyebrow style={{ marginBottom: 8 }}>Latest from Lentine</Eyebrow>
              <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray, padding: 18 }}>
                <Text style={{ color: fg.secondary, fontSize: 14, lineHeight: 21 }}>
                  Couldn&rsquo;t load articles right now.
                </Text>
                <Button label="Try again" size="sm" onPress={retryFeed} style={{ marginTop: 12 }} />
              </View>
            </>
          ) : restPool === null || filteredRest === null ? (
            <>
              <Eyebrow style={{ marginBottom: 8 }}>Latest from Lentine</Eyebrow>
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <ActivityIndicator color={colors.blue} />
              </View>
            </>
          ) : restPool.length === 0 && !sectioned ? (
            <>
              <Eyebrow style={{ marginBottom: 8 }}>Latest from Lentine</Eyebrow>
              <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray, padding: 18 }}>
                <Text style={{ color: fg.secondary, fontSize: 14 }}>Nothing published just yet — check back soon.</Text>
              </View>
            </>
          ) : (
            <>
              {sectioned ? (
                <>
                  <Eyebrow color={d.accent} style={{ marginBottom: 8 }}>
                    {`For your ${d.name}`}
                  </Eyebrow>
                  <View style={{ gap: 14 }}>
                    {sortedMatched.map((a) => (
                      <ArticleCard
                        key={a.id}
                        article={a}
                        locked={!canAccess(a, tier)}
                        flag={{ label: 'For you', color: d.accent }}
                        onPress={() => openArticle(a)}
                      />
                    ))}
                  </View>
                  {restPool.length > 0 ? (
                    <Eyebrow style={{ marginTop: 24, marginBottom: 8 }}>More from Lentine</Eyebrow>
                  ) : null}
                </>
              ) : (
                <Eyebrow style={{ marginBottom: 8 }}>Latest from Lentine</Eyebrow>
              )}
              {restPool.length > 1 ? (
                <View style={{ marginBottom: 12 }}>
                  {/* Primary chips: Recent shows everything; Type/Category open a value row. */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Chip
                      label="Recent"
                      selected={filter.kind === 'all' && chipGroup === null}
                      a11y="Show everything, newest first"
                      onPress={() => {
                        setFilter({ kind: 'all' });
                        setChipGroup(null);
                      }}
                    />
                    <Chip
                      label="Type"
                      selected={chipGroup === 'type' || filter.kind === 'type' || filter.kind === 'dosha'}
                      a11y="Filter by type"
                      onPress={() => setChipGroup((g) => (g === 'type' ? null : 'type'))}
                    />
                    {categories.length > 0 ? (
                      <Chip
                        label="Category"
                        selected={chipGroup === 'category' || filter.kind === 'category'}
                        a11y="Filter by category"
                        onPress={() => setChipGroup((g) => (g === 'category' ? null : 'category'))}
                      />
                    ) : null}
                  </View>
                  {chipValues.length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginTop: 8 }}
                      contentContainerStyle={{ flexDirection: 'row', gap: 8 }}
                    >
                      {chipValues.map((v) => (
                        <Chip
                          key={v.label}
                          label={v.label}
                          selected={sameFilter(filter, v.filter)}
                          a11y={`Show ${v.label}`}
                          onPress={() => pickFilter(v.filter)}
                        />
                      ))}
                    </ScrollView>
                  ) : null}
                </View>
              ) : null}
              {filteredRest.length === 0 ? (
                <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray, padding: 18 }}>
                  <Text style={{ color: fg.secondary, fontSize: 14, lineHeight: 21 }}>
                    Nothing here matches that filter yet.
                  </Text>
                  <Button
                    label="Show everything"
                    size="sm"
                    onPress={() => {
                      setFilter({ kind: 'all' });
                      setChipGroup(null);
                    }}
                    style={{ marginTop: 12 }}
                  />
                </View>
              ) : (
                <View style={{ gap: sectioned ? 10 : 14 }}>
                  {filteredRest.map((a) => (
                    <ArticleCard
                      key={a.id}
                      article={a}
                      variant={sectioned ? 'compact' : 'default'}
                      locked={!canAccess(a, tier)}
                      onPress={() => openArticle(a)}
                    />
                  ))}
                </View>
              )}
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
