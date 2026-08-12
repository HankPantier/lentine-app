import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import type { RecipeStructured } from '@/lib/articles';
import { nextStep, prevStep } from '@/lib/cook-nav';
import { colors, fg, fonts } from '@/theme/tokens';
import { Button } from './Button';
import { Prose } from './RecipeBody';
import { Text } from './Text';

type Step = RecipeStructured['instructions'][number];

/**
 * Focused, step-at-a-time cooking view. A fullscreen RN Modal (native-safe on iOS/Android/web)
 * that keeps the screen awake while open and walks Prev/Next through the recipe's instructions.
 *
 * Mount this CONDITIONALLY (`{cookOpen && <CookMode .../>}`): `useKeepAwake` activates on mount
 * and releases on unmount, so conditional mounting scopes wake-lock to exactly the open session.
 * On web it attempts the Wake Lock API and silently no-ops where unsupported — no platform branch.
 */
export function CookMode({
  visible,
  onClose,
  title,
  instructions,
  contentWidth,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  instructions: Step[];
  contentWidth: number;
}) {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  // Mounted fresh each time it opens (the reader conditionally mounts it), so step starts at 0.
  const [i, setI] = useState(0);
  const total = instructions.length;
  const step = instructions[i];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.taupe, paddingTop: insets.top }}>
        {/* Header: recipe title + Done */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 24,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.gray,
          }}
        >
          <Text
            weight="semibold"
            numberOfLines={1}
            style={{ flex: 1, fontSize: 14, color: colors.blue, marginRight: 12 }}
          >
            {title}
          </Text>
          <Pressable onPress={onClose} accessibilityRole="button" hitSlop={8}>
            <Text
              italic
              style={{ color: colors.blueBright, fontSize: 13, letterSpacing: 0.5, textTransform: 'uppercase' }}
            >
              Done ✕
            </Text>
          </Pressable>
        </View>

        {/* Current step */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 28 }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              borderWidth: 1.5,
              borderColor: colors.blue,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 18,
            }}
          >
            <Text style={{ fontSize: 20, fontFamily: fonts.bold, color: colors.blue }}>{i + 1}</Text>
          </View>
          {step?.headline ? (
            <Text weight="semibold" style={{ fontSize: 20, color: colors.blue, marginBottom: 10 }}>
              {step.headline}
            </Text>
          ) : null}
          {step?.content ? <Prose html={step.content} width={Math.max(contentWidth, 200)} /> : null}
        </ScrollView>

        {/* Footer: Prev / counter / Next */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 24,
            paddingTop: 14,
            paddingBottom: insets.bottom + 14,
            borderTopWidth: 1,
            borderTopColor: colors.gray,
          }}
        >
          <Button
            label="Prev"
            variant="outline"
            size="sm"
            disabled={i === 0}
            onPress={() => setI((n) => prevStep(n, total))}
          />
          <Text style={{ color: fg.tertiary, fontSize: 13, letterSpacing: 0.5 }}>
            {`${i + 1} of ${total}`}
          </Text>
          <Button
            label="Next"
            variant="outline"
            size="sm"
            disabled={i >= total - 1}
            onPress={() => setI((n) => nextStep(n, total))}
          />
        </View>
      </View>
    </Modal>
  );
}
