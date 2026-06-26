import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, StatusColorName } from '@/constants/theme';
import type { AppointmentStatus } from '@/lib/database.types';
import { useColors } from '@/hooks/use-colors';

/**
 * Mixes a hex color with white/black to derive a soft tinted background.
 * Keeps badges legible in both themes without separate fill tokens.
 */
function tint(hex: string, alpha: number) {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export type BadgeProps = {
  label: string;
  /** Any palette color (defaults to accent). */
  color?: string;
};

export function Badge({ label, color }: BadgeProps) {
  const c = useColors();
  const base = color ?? c.accent;
  return (
    <View style={[styles.badge, { backgroundColor: tint(base, 0.16) }]}>
      <ThemedText type="caption" style={{ color: base, fontWeight: '700' }}>
        {label}
      </ThemedText>
    </View>
  );
}

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Concluído',
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const c = useColors();
  return <Badge label={STATUS_LABEL[status]} color={c[StatusColorName[status]]} />;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
});
