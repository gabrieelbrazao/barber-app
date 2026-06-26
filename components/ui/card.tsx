import { Platform, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';

export type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Removes inner padding (for cards that manage their own layout). */
  flush?: boolean;
};

export function Card({ children, style, flush = false }: CardProps) {
  const c = useColors();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
          padding: flush ? 0 : Spacing.lg,
        },
        // Subtle lift on light; the hairline border carries it on dark.
        Platform.select({
          ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
          android: { elevation: 1 },
          default: {},
        }),
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
