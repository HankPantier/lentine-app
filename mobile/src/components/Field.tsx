import { useState } from 'react';
import { type KeyboardTypeOptions, Pressable, TextInput, View } from 'react-native';
import { colors, fg, fonts, radii } from '@/theme/tokens';
import { Eyebrow } from './Eyebrow';
import { Text } from './Text';

interface Props {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  dark?: boolean;
  error?: string;
  hint?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'email' | 'password' | 'name' | 'off';
  autoFocus?: boolean;
}

/**
 * Boxed text input per the brand design system: white fill (the one exception to the taupe
 * rule — gives contrast against the page), 1px gray hairline, sharp corners, 12px padding,
 * 16px text (avoids iOS zoom). Border brightens to teal on focus / red on error.
 */
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  dark = false,
  error,
  hint,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  autoComplete = 'off',
  autoFocus,
}: Props) {
  const [focused, setFocused] = useState(false);
  // Password fields start masked; the eye toggle reveals. Only rendered when secureTextEntry
  // is set, so non-password fields are untouched.
  const [revealed, setRevealed] = useState(false);
  const isPassword = !!secureTextEntry;
  const borderColor = error ? colors.red : focused ? colors.blueLight : colors.gray;

  return (
    <View style={{ marginBottom: 16 }}>
      <Eyebrow light={dark} style={{ marginBottom: 6 }}>
        {label}
      </Eyebrow>
      {/* Relative wrapper so the reveal toggle positions against the input alone (not the
          label/hint), matching the SearchBar's clear-button treatment. */}
      <View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={fg.tertiary}
          secureTextEntry={isPassword && !revealed}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            fontFamily: fonts.regular,
            fontSize: 16, // 16px avoids iOS zoom-on-focus
            color: colors.blue,
            backgroundColor: colors.white,
            borderWidth: 1,
            borderColor,
            borderRadius: radii.sharp,
            paddingVertical: 13,
            paddingLeft: 14,
            paddingRight: isPassword ? 58 : 14, // room for the Show/Hide toggle
          }}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            style={{ position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' }}
          >
            <Text
              style={{
                fontSize: 11,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                color: colors.blueBright,
              }}
            >
              {revealed ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text italic style={{ color: colors.red, fontSize: 12, marginTop: 4 }}>
          {error}
        </Text>
      ) : hint ? (
        <Text
          italic
          style={{ color: dark ? fg.onDarkSecondary : fg.tertiary, fontSize: 12, marginTop: 4 }}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
