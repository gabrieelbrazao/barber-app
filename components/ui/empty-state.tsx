import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';

export type EmptyStateProps = {
  icon: IconName;
  title: string;
  message?: string;
  children?: React.ReactNode;
};

export function EmptyState({ icon, title, message, children }: EmptyStateProps) {
  const c = useColors();
  return (
    <View style={styles.wrap}>
      <Icon name={icon} size={48} color={c.textMuted} />
      <ThemedText type="subtitle" style={styles.title}>
        {title}
      </ThemedText>
      {message ? (
        <ThemedText muted style={styles.message}>
          {message}
        </ThemedText>
      ) : null}
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  title: {
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
  },
  // alignSelf:center shrink-wraps the row to its content, so a child Button
  // (which forces alignSelf:flex-start) still ends up centered in the column.
  actions: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
});
