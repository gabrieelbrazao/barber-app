import { useRouter } from 'expo-router';
import { Alert, FlatList, StyleSheet } from 'react-native';

import {
  AppointmentCard,
  Button,
  EmptyState,
  ErrorState,
  Loading,
  Screen,
  ScreenHeader,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session';
import { useCancelAppointment, useMyAppointments } from '@/lib/queries';

export default function CustomerAppointmentsScreen() {
  const router = useRouter();
  const { profile } = useSession();
  const { data, isLoading, isError } = useMyAppointments(profile?.id ?? '');
  const cancel = useCancelAppointment(profile?.id ?? '');

  function onCancel(id: string) {
    Alert.alert('Cancelar agendamento?', 'Isso libera o horário.', [
      { text: 'Manter', style: 'cancel' },
      { text: 'Cancelar', style: 'destructive', onPress: () => cancel.mutate(id) },
    ]);
  }

  return (
    <Screen>
      <FlatList
        data={data ?? []}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<ScreenHeader title="Agendamentos" />}
        renderItem={({ item }) => {
          const upcoming = new Date(item.startTime) > new Date();
          const cancellable = upcoming && (item.status === 'pending' || item.status === 'confirmed');
          return (
            <AppointmentCard
              serviceName={item.serviceName}
              partyName={item.partyName}
              startTime={item.startTime}
              status={item.status}
              actions={
                cancellable ? (
                  <Button title="Cancelar" variant="ghost" size="sm" onPress={() => onCancel(item.id)} />
                ) : undefined
              }
            />
          );
        }}
        ListEmptyComponent={
          isLoading ? (
            <Loading />
          ) : isError ? (
            <ErrorState message="Não foi possível carregar seus agendamentos." />
          ) : (
            <EmptyState icon="calendar-outline" title="Nenhum agendamento ainda" message="Agende seu primeiro corte para vê-lo aqui.">
              <Button title="Encontrar um barbeiro" onPress={() => router.push('/')} />
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
});
