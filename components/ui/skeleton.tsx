import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';

export type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/** A single pulsing placeholder block. */
export function Skeleton({ width = '100%', height = 14, radius = Radius.sm, style }: SkeletonProps) {
  const c = useColors();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: c.surfaceAlt },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** Placeholder rows mimicking a list of BarberCards while barbers load. */
export function BarberListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <View style={styles.row}>
            <Skeleton width={48} height={48} radius={Radius.pill} />
            <View style={styles.lines}>
              <Skeleton width="60%" height={16} />
              <Skeleton width="40%" height={12} />
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

/** Placeholder rows mimicking a list of AppointmentCards while appointments load. */
export function AppointmentListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <View style={styles.lines}>
            <Skeleton width="55%" height={16} />
            <Skeleton width="35%" height={12} />
            <Skeleton width="45%" height={12} />
          </View>
        </Card>
      ))}
    </View>
  );
}

/** Placeholder rows mimicking a list of ServiceCards while services load. */
export function ServiceListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <View style={styles.spread}>
            <View style={styles.lines}>
              <Skeleton width="50%" height={16} />
              <Skeleton width="30%" height={12} />
            </View>
            <Skeleton width={72} height={32} radius={Radius.md} />
          </View>
        </Card>
      ))}
    </View>
  );
}

/** Placeholder grid mimicking time slots while availability loads. */
export function SlotsSkeleton({ count = 12 }: { count?: number }) {
  return (
    <View style={styles.slots}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} width={72} height={40} radius={Radius.md} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.md,
  },
  spread: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  slots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  lines: {
    flex: 1,
    gap: Spacing.sm,
  },
});
