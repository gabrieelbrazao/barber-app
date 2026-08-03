import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';
import { formatDuration, formatPrice } from '@/lib/format';
import { useColors } from '@/hooks/use-colors';

export type ServiceCardProps = {
  name: string;
  priceCents: number;
  durationMinutes: number;
  /** Renders a Book CTA when provided (customer view). */
  onBook?: () => void;
  /** Optional trailing controls (barber management view). */
  actions?: React.ReactNode;
  dimmed?: boolean;
};

export function ServiceCard({
  name,
  priceCents,
  durationMinutes,
  onBook,
  actions,
  dimmed = false,
}: ServiceCardProps) {
  const c = useColors();
  return (
    <Card style={dimmed ? { opacity: 0.6 } : undefined}>
      <View style={styles.row}>
        <View
          style={styles.info}
          accessible
          accessibilityLabel={`${name}, ${formatDuration(durationMinutes)}, ${formatPrice(priceCents)}`}>
          <ThemedText type="defaultSemiBold">{name}</ThemedText>
          <View style={styles.meta}>
            <Icon name="time-outline" size={14} color={c.textMuted} />
            <ThemedText type="caption" muted>
              {formatDuration(durationMinutes)}
            </ThemedText>
            <ThemedText type="caption" muted>
              ·
            </ThemedText>
            <ThemedText type="label" style={{ color: c.accent }}>
              {formatPrice(priceCents)}
            </ThemedText>
          </View>
        </View>
        {onBook ? (
          <Button
            title="Agendar"
            size="sm"
            onPress={onBook}
            accessibilityLabel={`Agendar ${name}`}
          />
        ) : (
          actions
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  info: {
    flex: 1,
    gap: Spacing.xs,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
});
