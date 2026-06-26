import { Image } from 'expo-image';
import { Dimensions, FlatList, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { Banner } from '@/lib/database.types';
import { Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';

const CARD_WIDTH = Math.min(Dimensions.get('window').width - Spacing.lg * 2, 520);
const CARD_HEIGHT = Math.round(CARD_WIDTH * 0.5);

/** Horizontal promo strip for a shop's active banners. Renders nothing when empty. */
export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const c = useColors();
  if (banners.length === 0) return null;

  return (
    <FlatList
      data={banners}
      keyExtractor={(b) => b.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={CARD_WIDTH + Spacing.md}
      decelerationRate="fast"
      contentContainerStyle={styles.content}
      renderItem={({ item }) => (
        <View style={[styles.card, { backgroundColor: c.surfaceAlt }]}>
          <Image source={{ uri: item.image_url }} style={styles.image} contentFit="cover" />
          {item.title ? (
            <View style={[styles.caption, { backgroundColor: c.surface }]}>
              <ThemedText type="label" numberOfLines={1}>
                {item.title}
              </ThemedText>
            </View>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.md,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  image: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  caption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
});
