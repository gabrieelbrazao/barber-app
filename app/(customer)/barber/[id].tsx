import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  Avatar,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  Loading,
  Screen,
  ServiceCard,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useBarber, useServices } from '@/lib/queries';
import { useColors } from '@/hooks/use-colors';

export default function BarberDetailScreen() {
  const c = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const barberQ = useBarber(id);
  const servicesQ = useServices(id);

  if (barberQ.isLoading) return <Screen><Loading /></Screen>;
  if (barberQ.isError || !barberQ.data)
    return <Screen><ErrorState message="Couldn't load this barber." /></Screen>;

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
                  <ThemedText type="title">{barber.shopName || barber.name}</ThemedText>
                  <ThemedText type="caption" muted>
                    {barber.name}
                  </ThemedText>
                  {barber.location ? (
                    <View style={styles.location}>
                      <Icon name="location-outline" size={14} color={c.textMuted} />
                      <ThemedText type="caption" muted>
                        {barber.location}
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
              </View>
              {barber.bio ? <ThemedText style={styles.bio}>{barber.bio}</ThemedText> : null}
            </Card>
            <ThemedText type="subtitle" style={styles.servicesTitle}>
              Services
            </ThemedText>
          </View>
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
            <Loading />
          ) : (
            <EmptyState icon="cut-outline" title="No services yet" />
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
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 2,
  },
  bio: {
    marginTop: Spacing.md,
  },
  servicesTitle: {
    marginTop: Spacing.sm,
  },
});
