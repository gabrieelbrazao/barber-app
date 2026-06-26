import { FlatList, StyleSheet, View } from 'react-native';

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
import type { AppointmentView } from '@/lib/queries';
import { useBarberAppointments, useUpdateAppointmentStatus } from '@/lib/queries';

export default function BarberScheduleScreen() {
  const { profile } = useSession();
  const barberId = profile?.id ?? '';
  const { data, isLoading, isError } = useBarberAppointments(barberId);
  const update = useUpdateAppointmentStatus(barberId);

  function actionsFor(a: AppointmentView) {
    const set = (status: 'confirmed' | 'cancelled' | 'completed') =>
      update.mutate({ id: a.id, status });

    if (a.status === 'pending') {
      return (
        <>
          <Button title="Confirmar" size="sm" onPress={() => set('confirmed')} />
          <Button title="Recusar" size="sm" variant="ghost" onPress={() => set('cancelled')} />
        </>
      );
    }
    if (a.status === 'confirmed') {
      return (
        <>
          <Button title="Concluir" size="sm" variant="secondary" onPress={() => set('completed')} />
          <Button title="Cancelar" size="sm" variant="ghost" onPress={() => set('cancelled')} />
        </>
      );
    }
    return null;
  }

  return (
    <Screen>
      <FlatList
        data={data ?? []}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<ScreenHeader title="Agenda" subtitle="Seus próximos agendamentos" />}
        renderItem={({ item }) => {
          const actions = actionsFor(item);
          return (
            <AppointmentCard
              serviceName={item.serviceName}
              partyName={item.partyName}
              startTime={item.startTime}
              status={item.status}
              actions={actions ? <View style={styles.actions}>{actions}</View> : undefined}
            />
          );
        }}
        ListEmptyComponent={
          isLoading ? (
            <Loading />
          ) : isError ? (
            <ErrorState message="Não foi possível carregar sua agenda." />
          ) : (
            <EmptyState
              icon="calendar-outline"
              title="Nenhum agendamento"
              message="Os agendamentos dos clientes aparecerão aqui."
            />
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
    gap: Spacing.sm,
  },
});
