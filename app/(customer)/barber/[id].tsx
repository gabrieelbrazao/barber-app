import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  Avatar,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  Loading,
  Screen,
  ServiceCard,
  ServiceListSkeleton,
  Stars,
} from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import {
  useBarber,
  useBarberPortfolio,
  useBarberRating,
  useBarberReviews,
  useServices,
} from '@/lib/queries';

export default function BarberDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const barberQ = useBarber(id);
  const servicesQ = useServices(id);
  const ratingQ = useBarberRating(id);
  const reviewsQ = useBarberReviews(id);
  const portfolioQ = useBarberPortfolio(id);

  if (barberQ.isLoading) return <Screen><Loading /></Screen>;
  if (barberQ.isError || !barberQ.data)
    return <Screen><ErrorState message="Não foi possível carregar este barbeiro." onRetry={() => barberQ.refetch()} /></Screen>;

  const barber = barberQ.data;

  return (
    <Screen edges={['bottom']}>
      <FlatList
        data={servicesQ.data ?? []}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Card>
              <View style={styles.row}>
                <Avatar name={barber.name} uri={barber.avatarUrl} size={64} />
                <View style={styles.info}>
                  <ThemedText type="title">{barber.name}</ThemedText>
                  {barber.title ? (
                    <ThemedText type="caption" muted>
                      {barber.title}
                    </ThemedText>
                  ) : null}
                </View>
              </View>
              {ratingQ.data ? (
                <View style={styles.rating}>
                  <Stars rating={ratingQ.data.avg_rating} count={ratingQ.data.review_count} size={16} />
                </View>
              ) : null}
              {barber.bio ? <ThemedText style={styles.bio}>{barber.bio}</ThemedText> : null}
            </Card>
            {(portfolioQ.data?.length ?? 0) > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.galleryRow}>
                {portfolioQ.data!.map((img) => (
                  <Image key={img.id} source={{ uri: img.image_url }} style={styles.galleryImg} contentFit="cover" />
                ))}
              </ScrollView>
            ) : null}
            <ThemedText type="subtitle" style={styles.servicesTitle}>
              Serviços
            </ThemedText>
          </View>
        }
        ListFooterComponent={
          (reviewsQ.data?.length ?? 0) > 0 ? (
            <View style={styles.reviews}>
              <Divider spacing={Spacing.md} />
              <ThemedText type="subtitle">Avaliações</ThemedText>
              {reviewsQ.data!.map((r) => (
                <Card key={r.id}>
                  <View style={styles.reviewHead}>
                    <ThemedText type="label">{r.customerName}</ThemedText>
                    <Stars rating={r.rating} size={12} />
                  </View>
                  {r.comment ? <ThemedText style={styles.reviewBody}>{r.comment}</ThemedText> : null}
                </Card>
              ))}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <ServiceCard
            name={item.name}
            priceCents={item.price_cents}
            durationMinutes={item.duration_minutes}
            onBook={() =>
              router.push({
                pathname: '/book/[serviceId]',
                params: { serviceId: item.id, barberId: barber.id },
              })
            }
          />
        )}
        ListEmptyComponent={
          servicesQ.isLoading ? (
            <ServiceListSkeleton />
          ) : (
            <EmptyState icon="cut-outline" title="Nenhum serviço ainda" />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    gap: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  bio: {
    marginTop: Spacing.md,
  },
  rating: {
    marginTop: Spacing.md,
  },
  galleryRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  galleryImg: {
    width: 120,
    height: 120,
    borderRadius: Radius.md,
  },
  servicesTitle: {
    marginTop: Spacing.sm,
  },
  reviews: {
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  reviewHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewBody: {
    marginTop: Spacing.sm,
  },
});
