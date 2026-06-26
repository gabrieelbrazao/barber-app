import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { Spacing } from '@/constants/theme';
import { useThemeMode, type ThemeMode } from '@/contexts/theme-mode';

const OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: 'Sistema' },
  { mode: 'light', label: 'Claro' },
  { mode: 'dark', label: 'Escuro' },
];

/** Segmented control to follow the device theme or force light/dark. */
export function ThemeModeToggle() {
  const { mode, setMode } = useThemeMode();
  return (
    <View style={styles.wrap}>
      <ThemedText type="label">Tema</ThemedText>
      <View style={styles.row}>
        {OPTIONS.map((o) => (
          <Chip key={o.mode} label={o.label} selected={mode === o.mode} onPress={() => setMode(o.mode)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});
