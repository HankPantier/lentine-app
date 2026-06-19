import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Eyebrow, Heading, OnbTopBar, Screen, Text } from '@/components';
import { useOnboarding } from '@/onboarding/state';
import { progress } from '@/onboarding/steps';
import { colors, fg } from '@/theme/tokens';

const PREFS = [
  { id: 'rituals', label: 'Daily rituals', detail: 'A gentle nudge for your dosha practice' },
  { id: 'recipes', label: 'New recipes', detail: 'When fresh dosha-matched recipes drop' },
  { id: 'btf', label: 'Back to Forward', detail: 'New program chapters and live moments' },
] as const;

function CheckRow({
  label,
  detail,
  checked,
  onToggle,
}: {
  label: string;
  detail: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderWidth: 2,
          borderColor: checked ? colors.blueLight : colors.gray,
          backgroundColor: checked ? colors.blueLight : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? <Text style={{ color: colors.blue, fontSize: 13 }}>✓</Text> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text weight="semibold" style={{ fontSize: 15, color: colors.blue }}>
          {label}
        </Text>
        <Text style={{ color: fg.secondary, fontSize: 13, marginTop: 1 }}>{detail}</Text>
      </View>
    </Pressable>
  );
}

export default function NotificationsRoute() {
  const router = useRouter();
  const { state, update } = useOnboarding();
  const [checked, setChecked] = useState<Record<string, boolean>>({
    rituals: true,
    recipes: true,
    btf: true,
  });

  const { current, total } = progress(state.mode, 'notifications');

  const finish = () => {
    update({ completed: true });
    router.replace('/home');
  };

  return (
    <Screen>
      <OnbTopBar current={current} total={total} onBack={() => router.back()} />
      <Eyebrow>Stay connected</Eyebrow>
      <Heading style={{ marginTop: 8, marginBottom: 8 }}>
        Stay connected,{' '}
        <Text italic style={{ fontSize: 30, lineHeight: 35 }}>
          {state.firstName || 'friend'}
        </Text>
      </Heading>
      <Text style={{ color: fg.secondary, fontSize: 15, lineHeight: 23, marginBottom: 16 }}>
        Choose what you&rsquo;d like to hear about. You can change this anytime.
      </Text>

      <View style={{ marginBottom: 12 }}>
        {PREFS.map((p) => (
          <CheckRow
            key={p.id}
            label={p.label}
            detail={p.detail}
            checked={!!checked[p.id]}
            onToggle={() => setChecked((c) => ({ ...c, [p.id]: !c[p.id] }))}
          />
        ))}
      </View>

      <Button label="Turn on notifications" fullWidth size="lg" onPress={finish} style={{ marginTop: 8 }} />
      <View style={{ alignItems: 'center', marginTop: 12 }}>
        <Button label="Maybe later" variant="plain" onPress={finish} />
      </View>
    </Screen>
  );
}
