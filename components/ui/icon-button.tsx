import { Pressable, StyleSheet } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Radius } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';

export type IconButtonProps = {
  name: IconName;
  onPress?: () => void;
  size?: number;
  color?: string;
  accessibilityLabel: string;
  disabled?: boolean;
};

export function IconButton({
  name,
  onPress,
  size = 22,
  color,
  accessibilityLabel,
  disabled = false,
}: IconButtonProps) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.btn, { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }]}>
      <Icon name={name} size={size} color={color ?? c.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    padding: 6,
    borderRadius: Radius.pill,
  },
});
