import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';

export type StarsProps = {
  rating: number; // 0..5
  count?: number;
  size?: number;
};

export function Stars({ rating, count, size = 14 }: StarsProps) {
  const c = useColors();
  const rounded = Math.round(rating * 2) / 2;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${rounded} de 5${count != null ? `, ${count} avaliações` : ''}`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const name = rounded >= i ? 'star' : rounded >= i - 0.5 ? 'star-half' : 'star-outline';
        return <Icon key={i} name={name} size={size} color={c.accent} />;
      })}
      {count != null ? (
        <ThemedText type="caption" muted style={styles.count}>
          ({count})
        </ThemedText>
      ) : null}
    </View>
  );
}

export type StarInputProps = {
  value: number; // 0..5 (0 = unrated)
  onChange: (value: number) => void;
  size?: number;
};

/** Tappable 1–5 star picker for leaving a review. */
export function StarInput({ value, onChange, size = 36 }: StarInputProps) {
  const c = useColors();
  return (
    <View style={styles.inputRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable
          key={i}
          onPress={() => onChange(i)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`${i} ${i === 1 ? 'estrela' : 'estrelas'}`}>
          <Icon name={value >= i ? 'star' : 'star-outline'} size={size} color={c.accent} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  count: {
    marginLeft: Spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});
