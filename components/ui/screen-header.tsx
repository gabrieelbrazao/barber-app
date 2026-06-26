import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  /** Optional trailing element (e.g. an IconButton). */
  right?: React.ReactNode;
};

export function ScreenHeader({ title, subtitle, right }: ScreenHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.titles}>
        <ThemedText type="display">{title}</ThemedText>
        {subtitle ? (
          <ThemedText muted style={styles.subtitle}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  titles: {
    flex: 1,
    gap: Spacing.xs,
  },
  subtitle: {
    marginTop: 2,
  },
});
