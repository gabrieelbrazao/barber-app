import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, RefreshControl, SectionList, StyleSheet, View } from 'react-native';

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
import type { AppointmentView } from '@/lib/queries';
import { useCancelAppointment, useMyAppointments } from '@/lib/queries';
import { cancelReminder } from '@/lib/notifications';
import { useColors } from '@/hooks/use-colors';
import { splitByTime } from '@/lib/appointments';

export default function CustomerAppointmentsScreen() {
  const c = useColors();
  const router = useRouter();
  const { profile } = useSession();
  const { data, isLoading, isError, refetch, isRefetching } = useMyAppointments(profile?.id ?? '');
  const cancel = useCancelAppointment(profile?.id ?? '');

  const sections = useMemo(() => splitByTime(data ?? []), [data]);

  function onCancel(id: string) {
    Alert.alert('Cancelar agendamento?', 'Isso libera o horário.', [
      { text: 'Manter', style: 'cancel' },
      {
        text: 'Cancelar',
        style: 'destructive',
        onPress: () => cancel.mutate(id, { onSuccess: () => cancelReminder(id) }),
      },
    ]);
  }

  function goReview(item: AppointmentView) {
    router.push({
      pathname: '/review/[appointmentId]',
      params: { appointmentId: item.id, barberId: item.barberId, barberName: item.partyName },
    });
  }

  function goReschedule(item: AppointmentView) {
    router.push({
      pathname: '/reschedule/[appointmentId]',
      params: { appointmentId: item.id, barberId: item.barberId },
    });
  }

  function renderItem(item: AppointmentView) {
    const upcoming = new Date(item.startTime) > new Date();
    const cancellable = upcoming && (item.status === 'pending' || item.status === 'confirmed');
    const reviewable = item.status === 'completed';
    return (
      <AppointmentCard
        serviceName={item.serviceName}
        partyName={item.partyName}
        startTime={item.startTime}
        status={item.status}
        actions={
          cancellable ? (
            <View style={styles.actions}>
              <Button title="Remarcar" variant="secondary" size="sm" onPress={() => goReschedule(item)} />
              <Button title="Cancelar" variant="ghost" size="sm" onPress={() => onCancel(item.id)} />
            </View>
          ) : reviewable ? (
            <Button title="Avaliar" variant="secondary" size="sm" onPress={() => goReview(item)} />
          ) : undefined
        }
      />
    );
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
        ListHeaderComponent={<ScreenHeader title="Agendamentos" />}
        renderSectionHeader={({ section }) => (
          <ThemedText type="label" muted style={styles.sectionHeader}>
            {section.title}
          </ThemedText>
        )}
        renderItem={({ item }) => renderItem(item)}
        ListEmptyComponent={
          isLoading ? (
            <AppointmentListSkeleton />
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
