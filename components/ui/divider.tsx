import { StyleSheet, View } from 'react-native';

import { useColors } from '@/hooks/use-colors';

export function Divider({ spacing = 0 }: { spacing?: number }) {
  const c = useColors();
  return <View style={[styles.line, { backgroundColor: c.border, marginVertical: spacing }]} />;
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
});
