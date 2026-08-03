import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Loading,
  Screen,
  SlotButton,
  SlotsSkeleton,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session';
import { generateSlots } from '@/lib/availability';
import { toUserMessage } from '@/lib/errors';
import { formatTime } from '@/lib/format';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { scheduleReminder } from '@/lib/notifications';
import {
  useAppointmentDuration,
  useBarber,
  useDayAppointments,
  useDayBlocks,
  useRescheduleAppointment,
} from '@/lib/queries';

const DAYS_AHEAD = 14;

function nextDays(count: number): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function dayChipLabel(d: Date, index: number): string {
  if (index === 0) return 'Hoje';
  if (index === 1) return 'Amanhã';
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' });
}

export default function RescheduleScreen() {
  const router = useRouter();
  const { appointmentId, barberId } = useLocalSearchParams<{
    appointmentId: string;
    barberId: string;
  }>();
  const { profile } = useSession();

  const days = useMemo(() => nextDays(DAYS_AHEAD), []);
  const [day, setDay] = useState<Date>(days[0]);
  const [selected, setSelected] = useState<Date | null>(null);

  const barberQ = useBarber(barberId);
  const durationQ = useAppointmentDuration(appointmentId);
  const dayApptsQ = useDayAppointments(barberId, day);
  const dayBlocksQ = useDayBlocks(barberId, day);
  const reschedule = useRescheduleAppointment();

  const slots = useMemo(() => {
    if (!barberQ.data || !durationQ.data) return [];
    return generateSlots(
      day,
      barberQ.data.workingHours,
      durationQ.data,
      dayApptsQ.data ?? [],
      dayBlocksQ.data ?? []
    );
  }, [barberQ.data, durationQ.data, day, dayApptsQ.data, dayBlocksQ.data]);

  if (barberQ.isLoading || durationQ.isLoading) return <Screen><Loading /></Screen>;
  if (barberQ.isError || !durationQ.data)
    return <Screen><ErrorState message="Não foi possível carregar este agendamento." /></Screen>;

  async function onConfirm() {
    if (!selected || !profile || !durationQ.data) return;
    const end = new Date(selected.getTime() + durationQ.data * 60_000);
    try {
      await reschedule.mutateAsync({
        id: appointmentId,
        barberId,
        customerId: profile.id,
        start: selected,
        end,
      });
      scheduleReminder({
        appointmentId,
        startISO: selected.toISOString(),
        title: 'Lembrete de agendamento',
        body: `Seu horário foi remarcado para ${formatTime(selected.toISOString())}.`,
      }).catch(() => {});
      hapticSuccess();
      Alert.alert('Remarcado!', 'Seu agendamento foi movido e aguarda confirmação.');
      router.replace('/appointments');
    } catch (e) {
      hapticError();
      Alert.alert('Não foi possível remarcar', toUserMessage(e));
    }
  }

  return (
    <Screen edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <ThemedText type="label" muted>
            DATA
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
            {days.map((d, i) => (
              <Chip
                key={d.toISOString()}
                label={dayChipLabel(d, i)}
                selected={d.toDateString() === day.toDateString()}
                onPress={() => {
                  setDay(d);
                  setSelected(null);
                }}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <ThemedText type="label" muted>
            NOVO HORÁRIO
          </ThemedText>
          {dayApptsQ.isLoading ? (
            <SlotsSkeleton />
          ) : slots.length === 0 ? (
            <EmptyState icon="moon-outline" title="Fechado neste dia" message="Escolha outra data." />
          ) : (
            <View style={styles.slots}>
              {slots.map((s) => (
                <SlotButton
                  key={s.start.toISOString()}
                  label={formatTime(s.start.toISOString())}
                  disabled={!s.available}
                  selected={selected?.getTime() === s.start.getTime()}
                  onPress={() => setSelected(s.start)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={selected ? `Remarcar para ${formatTime(selected.toISOString())}` : 'Selecione um horário'}
          fullWidth
          disabled={!selected}
          loading={reschedule.isPending}
          onPress={onConfirm}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  section: {
    gap: Spacing.sm,
  },
  days: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  slots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  footer: {
    padding: Spacing.lg,
  },
});
