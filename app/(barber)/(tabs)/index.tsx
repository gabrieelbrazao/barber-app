import { useMemo } from 'react';
import { RefreshControl, SectionList, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  AppointmentCard,
  AppointmentListSkeleton,
  Button,
  EmptyState,
  ErrorState,
  Screen,
  ScreenHeader,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session';
import { splitByTime } from '@/lib/appointments';
import type { AppointmentView } from '@/lib/queries';
import { useBarberAppointments, useUpdateAppointmentStatus } from '@/lib/queries';
import { useColors } from '@/hooks/use-colors';

export default function BarberScheduleScreen() {
  const c = useColors();
  const { profile } = useSession();
  const barberId = profile?.id ?? '';
  const { data, isLoading, isError, refetch, isRefetching } = useBarberAppointments(barberId);
  const update = useUpdateAppointmentStatus(barberId);

  const sections = useMemo(() => splitByTime(data ?? []), [data]);

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
      <SectionList
        sections={sections}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.content}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.accent} />
        }
        ListHeaderComponent={<ScreenHeader title="Agenda" subtitle="Seus próximos agendamentos" />}
        renderSectionHeader={({ section }) => (
          <ThemedText type="label" muted style={styles.sectionHeader}>
            {section.title}
          </ThemedText>
        )}
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
            <AppointmentListSkeleton />
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
  sectionHeader: {
    marginTop: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});
