import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';

export type SlotButtonProps = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
};

export function SlotButton({ label, selected = false, disabled = false, onPress }: SlotButtonProps) {
  const c = useColors();

  const bg = selected ? c.accent : c.surface;
  const border = selected ? c.accent : c.border;
  const fg = selected ? c.onAccent : disabled ? c.textMuted : c.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.slot,
        {
          backgroundColor: bg,
          borderColor: border,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        },
      ]}>
      <ThemedText type="label" style={{ color: fg }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 84,
    alignItems: 'center',
  },
});
