import { useRouter } from 'expo-router';
import { Alert, FlatList, StyleSheet, View } from 'react-native';

import {
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  Loading,
  Screen,
  ScreenHeader,
  ServiceCard,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session';
import { useDeleteService, useServices } from '@/lib/queries';
import { useColors } from '@/hooks/use-colors';

export default function BarberServicesScreen() {
  const c = useColors();
  const router = useRouter();
  const { profile } = useSession();
  const barberId = profile?.id ?? '';
  const { data, isLoading, isError } = useServices(barberId, true);
  const del = useDeleteService(barberId);

  function onDelete(id: string, name: string) {
    Alert.alert('Delete service?', `"${name}" will be removed.`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => del.mutate(id) },
    ]);
  }

  return (
    <Screen>
      <FlatList
        data={data ?? []}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <ScreenHeader
            title="Services"
            subtitle="What you offer"
            right={
              <IconButton
                name="add-circle"
                size={28}
                color={c.accent}
                accessibilityLabel="Add service"
                onPress={() => router.push('/edit-service')}
              />
            }
          />
        }
        renderItem={({ item }) => (
          <ServiceCard
            name={item.active ? item.name : `${item.name} (hidden)`}
            priceCents={item.price_cents}
            durationMinutes={item.duration_minutes}
            dimmed={!item.active}
            actions={
              <View style={styles.actions}>
                <IconButton
                  name="pencil"
                  accessibilityLabel={`Edit ${item.name}`}
                  onPress={() =>
                    router.push({ pathname: '/edit-service', params: { serviceId: item.id } })
                  }
                />
                <IconButton
                  name="trash-outline"
                  color={c.cancelled}
                  accessibilityLabel={`Delete ${item.name}`}
                  onPress={() => onDelete(item.id, item.name)}
                />
              </View>
            }
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <Loading />
          ) : isError ? (
            <ErrorState message="Couldn't load your services." />
          ) : (
            <EmptyState icon="pricetags-outline" title="No services yet" message="Add your first service.">
              <Button title="Add service" onPress={() => router.push('/edit-service')} />
            </EmptyState>
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
    flexGrow: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
});
