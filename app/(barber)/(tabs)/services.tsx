import { useRouter } from 'expo-router';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import {
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  Screen,
  ScreenHeader,
  ServiceCard,
  ServiceListSkeleton,
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
  const { data, isLoading, isError, refetch, isRefetching } = useServices(barberId, true);
  const del = useDeleteService(barberId);

  function onDelete(id: string, name: string) {
    Alert.alert('Excluir serviço?', `"${name}" será removido.`, [
      { text: 'Manter', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => del.mutate(id) },
    ]);
  }

  return (
    <Screen>
      <FlatList
        data={data ?? []}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.accent} />
        }
        ListHeaderComponent={
          <ScreenHeader
            title="Serviços"
            subtitle="O que você oferece"
            right={
              <IconButton
                name="add-circle"
                size={28}
                color={c.accent}
                accessibilityLabel="Adicionar serviço"
                onPress={() => router.push('/edit-service')}
              />
            }
          />
        }
        renderItem={({ item }) => (
          <ServiceCard
            name={item.active ? item.name : `${item.name} (oculto)`}
            priceCents={item.price_cents}
            durationMinutes={item.duration_minutes}
            dimmed={!item.active}
            actions={
              <View style={styles.actions}>
                <IconButton
                  name="pencil"
                  accessibilityLabel={`Editar ${item.name}`}
                  onPress={() =>
                    router.push({ pathname: '/edit-service', params: { serviceId: item.id } })
                  }
                />
                <IconButton
                  name="trash-outline"
                  color={c.cancelled}
                  accessibilityLabel={`Excluir ${item.name}`}
                  onPress={() => onDelete(item.id, item.name)}
                />
              </View>
            }
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <ServiceListSkeleton />
          ) : isError ? (
            <ErrorState message="Não foi possível carregar seus serviços." />
          ) : (
            <EmptyState icon="pricetags-outline" title="Nenhum serviço ainda" message="Adicione seu primeiro serviço.">
              <Button title="Adicionar serviço" onPress={() => router.push('/edit-service')} />
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
