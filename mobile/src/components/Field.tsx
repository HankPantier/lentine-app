import { useState } from 'react';
import { type KeyboardTypeOptions, TextInput, View } from 'react-native';
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
  const borderColor = error ? colors.red : focused ? colors.blueLight : colors.gray;

  return (
    <View style={{ marginBottom: 16 }}>
      <Eyebrow light={dark} style={{ marginBottom: 6 }}>
        {label}
      </Eyebrow>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={fg.tertiary}
        secureTextEntry={secureTextEntry}
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
          paddingHorizontal: 14,
          paddingVertical: 13,
        }}
      />
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
