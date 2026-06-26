import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';

export type ScreenProps = {
  children: React.ReactNode;
  edges?: Edge[];
};

/** Full-bleed background + safe area, used by every screen. */
export function Screen({ children, edges = ['top'] }: ScreenProps) {
  const c = useColors();
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.background }]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

export function Loading() {
  const c = useColors();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={c.accent} />
    </View>
  );
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <View style={styles.center}>
      <ThemedText muted>{message ?? 'Something went wrong.'}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
});
