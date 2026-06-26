import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';

export type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string;
  /** Optional leading element (e.g. an icon). */
  left?: React.ReactNode;
  /** Optional trailing element (e.g. a password visibility toggle). */
  right?: React.ReactNode;
};

export function TextField({ label, error, left, right, style, onFocus, onBlur, ...rest }: TextFieldProps) {
  const c = useColors();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? c.cancelled : focused ? c.accent : c.border;

  return (
    <View style={styles.wrap}>
      {label ? (
        <ThemedText type="label" style={styles.label}>
          {label}
        </ThemedText>
      ) : null}
      <View
        style={[
          styles.field,
          { backgroundColor: c.surface, borderColor },
        ]}>
        {left}
        <TextInput
          placeholderTextColor={c.textMuted}
          style={[styles.input, { color: c.text }, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {right}
      </View>
      {error ? (
        <ThemedText type="caption" style={[styles.error, { color: c.cancelled }]}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.xs,
  },
  label: {
    marginLeft: Spacing.xs,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.md,
  },
  error: {
    marginLeft: Spacing.xs,
  },
});
