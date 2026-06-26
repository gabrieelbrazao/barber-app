import { ActivityIndicator, Pressable, type PressableProps, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Optional leading element (e.g. an icon). */
  left?: React.ReactNode;
  fullWidth?: boolean;
};

const SIZES: Record<Size, { padV: number; padH: number; font: 'label' | 'defaultSemiBold' }> = {
  sm: { padV: Spacing.sm, padH: Spacing.md, font: 'label' },
  md: { padV: Spacing.md, padH: Spacing.lg, font: 'defaultSemiBold' },
  lg: { padV: Spacing.lg, padH: Spacing.xl, font: 'defaultSemiBold' },
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  left,
  fullWidth = false,
  disabled,
  ...rest
}: ButtonProps) {
  const c = useColors();
  const s = SIZES[size];
  const isDisabled = disabled || loading;

  const bg =
    variant === 'primary' ? c.accent : variant === 'secondary' ? c.surfaceAlt : 'transparent';
  const fg = variant === 'primary' ? c.onAccent : c.text;
  const border = variant === 'ghost' ? c.border : 'transparent';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor: border,
          paddingVertical: s.padV,
          paddingHorizontal: s.padH,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
      ]}
      {...rest}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={fg} />
        ) : (
          <>
            {left}
            <ThemedText type={s.font} style={{ color: fg }}>
              {title}
            </ThemedText>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
});
