import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
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

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <ThemedText muted style={styles.errorText}>
        {message ?? 'Algo deu errado.'}
      </ThemedText>
      {onRetry ? <Button title="Tentar novamente" variant="ghost" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  errorText: {
    textAlign: 'center',
  },
});
