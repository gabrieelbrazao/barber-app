import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { STATUS_LABEL, StatusBadge } from '@/components/ui/badge';
import { Spacing } from '@/constants/theme';
import type { AppointmentStatus } from '@/lib/database.types';
import { formatDate, formatTime } from '@/lib/format';
import { useColors } from '@/hooks/use-colors';

export type AppointmentCardProps = {
  serviceName: string;
  /** The other party — barber name (customer view) or customer name (barber view). */
  partyName: string;
  startTime: string;
  status: AppointmentStatus;
  /** Optional action row (e.g. cancel / confirm buttons). */
  actions?: React.ReactNode;
};

export function AppointmentCard({
  serviceName,
  partyName,
  startTime,
  status,
  actions,
}: AppointmentCardProps) {
  const c = useColors();
  // Read the whole summary as one item; `actions` stays outside so its buttons
  // remain individually focusable.
  const label = `${serviceName}, ${partyName}, ${formatDate(startTime)} às ${formatTime(startTime)}, ${STATUS_LABEL[status]}`;
  return (
    <Card>
      <View accessible accessibilityLabel={label}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.flex}>
            {serviceName}
          </ThemedText>
          <StatusBadge status={status} />
        </View>

        <View style={styles.metaRow}>
          <Icon name="person-outline" size={14} color={c.textMuted} />
          <ThemedText type="caption" muted>
            {partyName}
          </ThemedText>
        </View>
        <View style={styles.metaRow}>
          <Icon name="calendar-outline" size={14} color={c.textMuted} />
          <ThemedText type="caption" muted>
            {formatDate(startTime)} · {formatTime(startTime)}
          </ThemedText>
        </View>
      </View>

      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  flex: { flex: 1 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
});
