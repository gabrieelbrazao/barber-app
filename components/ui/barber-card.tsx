import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Stars } from '@/components/ui/stars';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';

export type BarberCardProps = {
  name: string;
  title?: string | null;
  avatarUrl?: string | null;
  rating?: number;
  reviewCount?: number;
  onPress?: () => void;
};

export function BarberCard({ name, title, avatarUrl, rating, reviewCount, onPress }: BarberCardProps) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessible
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={[name, title, rating != null ? `${rating.toFixed(1)} de 5` : null]
        .filter(Boolean)
        .join(', ')}
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
      <Card>
        <View style={styles.row}>
          <Avatar name={name} uri={avatarUrl} size={56} />
          <View style={styles.info}>
            <ThemedText type="subtitle">{name}</ThemedText>
            {title ? (
              <ThemedText type="caption" muted>
                {title}
              </ThemedText>
            ) : null}
            {rating != null ? <Stars rating={rating} count={reviewCount} /> : null}
          </View>
          <Icon name="chevron-forward" size={20} color={c.textMuted} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  info: {
    flex: 1,
    gap: 2,
  },
});
