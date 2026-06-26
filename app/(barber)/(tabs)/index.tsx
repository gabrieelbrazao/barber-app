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
          <Button title="Confirm" size="sm" onPress={() => set('confirmed')} />
          <Button title="Decline" size="sm" variant="ghost" onPress={() => set('cancelled')} />
        </>
      );
    }
    if (a.status === 'confirmed') {
      return (
        <>
          <Button title="Complete" size="sm" variant="secondary" onPress={() => set('completed')} />
          <Button title="Cancel" size="sm" variant="ghost" onPress={() => set('cancelled')} />
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
        ListHeaderComponent={<ScreenHeader title="Schedule" subtitle="Your incoming appointments" />}
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
            <ErrorState message="Couldn't load your schedule." />
          ) : (
            <EmptyState
              icon="calendar-outline"
              title="No appointments"
              message="Bookings from clients will show up here."
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
