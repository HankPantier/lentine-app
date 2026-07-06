import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Platform, View } from 'react-native';
import { AppHeader, Button, Eyebrow, Heading, OnbTopBar, Screen, Text } from '@/components';
import { formatLongDate } from '@/lib/format';
import { SITE_URL, TIER_NAME } from '@/onboarding/pricing';
import { useOnboarding } from '@/onboarding/state';
import { progress } from '@/onboarding/steps';
import { colors, fg } from '@/theme/tokens';

interface PlanDef {
  eyebrow: string;
  name: string;
  priceMo: number;
  bullets: string[];
  featured?: boolean;
}

const PLANS: PlanDef[] = [
  {
    eyebrow: 'Weekly infusion',
    name: 'Recipe Club',
    priceMo: 9,
    bullets: ['Dosha-matched recipes', 'New drops every week', 'Seasonal guidance'],
  },
  {
    eyebrow: 'Full immersion',
    name: 'Back to Forward',
    priceMo: 29,
    bullets: [
      'Everything in Recipe Club',
      'The full Back to Forward program',
      'Rituals, practices & deep dives',
      'Members-only library',
    ],
    featured: true,
  },
];

/** Informational plan card (no selection state — purchase isn't in-app yet). */
function PlanCard({ plan }: { plan: PlanDef }) {
  const dark = plan.featured;
  const text = dark ? colors.white : colors.blue;
  const sub = dark ? fg.onDarkSecondary : fg.secondary;
  return (
    <View
      style={{
        backgroundColor: dark ? colors.blue : colors.white,
        borderWidth: 1,
        borderColor: dark ? colors.blue : colors.gray,
        padding: 20,
      }}
    >
      <Eyebrow light={dark} color={dark ? colors.blueLight : colors.blueBright}>
        {plan.eyebrow}
      </Eyebrow>
      <Heading dark={dark} size={26} style={{ marginTop: 8 }}>
        {plan.name}
      </Heading>
      <Text style={{ color: text, fontSize: 15, marginTop: 4 }}>
        <Text weight="bold" style={{ color: text, fontSize: 22 }}>{`$${plan.priceMo}`}</Text>
        <Text style={{ color: sub }}> / month</Text>
      </Text>
      <View style={{ marginTop: 14, gap: 6 }}>
        {plan.bullets.map((b) => (
          <View key={b} style={{ flexDirection: 'row', gap: 8 }}>
            <Text style={{ color: colors.blueLight, fontSize: 14, lineHeight: 21 }}>✓</Text>
            <Text style={{ color: sub, fontSize: 14, lineHeight: 21, flex: 1 }}>{b}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * The membership page — what the plans include and where membership stands today. Reached
 * from locked content ("Explore membership"), the home/account subscription cards, and as
 * the informational step of new-user onboarding (replacing the old tier→billing→mock-payment
 * chain; nobody types card digits into a demo form).
 *
 * Purchases open in-app with Stripe. Until then membership lives on the website — mentioned
 * as a tappable link on web/Android and as plain copy on iOS (App Store 3.1.1: no external
 * purchase links for digital content).
 */
export default function MembershipRoute() {
  const router = useRouter();
  const { state, update } = useOnboarding();
  const sub = state.subscription;

  // During new-user onboarding this screen is a flow step (dots + Continue); afterwards it's
  // a regular page (back + title).
  const onboarding = state.mode !== 'migrating' && !state.completed;
  const { current, total } = progress(state.mode, 'membership');

  return (
    <Screen>
      {onboarding ? (
        <OnbTopBar onBack={() => router.back()} current={current} total={total} />
      ) : (
        <AppHeader onBack={() => router.back()} />
      )}

      <Eyebrow>{sub ? 'Your membership' : 'Membership'}</Eyebrow>
      <Heading style={{ marginTop: 8, marginBottom: 20 }}>
        {sub ? 'You’re a ' : 'Two paths, one '}
        <Text italic style={{ fontSize: 30, lineHeight: 35 }}>
          {sub ? 'member' : 'practice'}
        </Text>
      </Heading>

      {sub ? (
        <View style={{ backgroundColor: colors.blue, padding: 18, marginBottom: 20 }}>
          <Eyebrow light color={colors.blueLight} style={{ marginBottom: 6 }}>
            Active plan
          </Eyebrow>
          <Text weight="semibold" style={{ color: colors.white, fontSize: 17 }}>
            {TIER_NAME[sub.tier]}
          </Text>
          <Text style={{ color: fg.onDarkSecondary, fontSize: 14, marginTop: 4 }}>
            {`Billed ${sub.interval === 'year' ? 'yearly' : 'monthly'}`}
            {sub.currentPeriodEnd ? ` · renews ${formatLongDate(sub.currentPeriodEnd)}` : ''}
          </Text>
          <Text italic style={{ color: fg.onDarkSecondary, fontSize: 13, marginTop: 8 }}>
            Plan changes and cancellation are coming soon.
          </Text>
        </View>
      ) : null}

      <View style={{ gap: 16 }}>
        {PLANS.map((p) => (
          <PlanCard key={p.name} plan={p} />
        ))}
      </View>

      {!sub ? (
        <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray, padding: 18, marginTop: 20 }}>
          <Eyebrow color={colors.blueBright} style={{ marginBottom: 6 }}>
            Ready to join?
          </Eyebrow>
          <Text style={{ color: fg.secondary, fontSize: 14, lineHeight: 21 }}>
            {Platform.OS === 'ios'
              ? 'In-app membership is coming soon. Today, membership is managed on lentinealexis.com.'
              : 'In-app membership is coming soon. Today, membership is available on lentinealexis.com.'}
          </Text>
          {Platform.OS !== 'ios' ? (
            <Button
              label="Visit lentinealexis.com"
              variant="outline"
              size="sm"
              onPress={() => WebBrowser.openBrowserAsync(SITE_URL)}
              style={{ marginTop: 14 }}
            />
          ) : null}
          {!state.userId ? (
            <Button
              label="Already a member? Sign in"
              size="sm"
              onPress={() => {
                update({ mode: 'migrating' });
                router.push('/signup');
              }}
              style={{ marginTop: 10 }}
            />
          ) : null}
        </View>
      ) : null}

      {onboarding ? (
        <Button
          label="Continue"
          fullWidth
          size="lg"
          onPress={() => router.push('/notifications')}
          style={{ marginTop: 24 }}
        />
      ) : null}
    </Screen>
  );
}
