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
  shopName?: string | null;
  location?: string | null;
  avatarUrl?: string | null;
  rating?: number;
  reviewCount?: number;
  onPress?: () => void;
};

export function BarberCard({
  name,
  shopName,
  location,
  avatarUrl,
  rating,
  reviewCount,
  onPress,
}: BarberCardProps) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
      <Card>
        <View style={styles.row}>
          <Avatar name={name} uri={avatarUrl} size={56} />
          <View style={styles.info}>
            <ThemedText type="subtitle">{shopName || name}</ThemedText>
            {shopName ? (
              <ThemedText type="caption" muted>
                {name}
              </ThemedText>
            ) : null}
            {location ? (
              <View style={styles.location}>
                <Icon name="location-outline" size={13} color={c.textMuted} />
                <ThemedText type="caption" muted>
                  {location}
                </ThemedText>
              </View>
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
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
});
