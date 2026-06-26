import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Loading,
  Screen,
  SlotButton,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session';
import { generateSlots } from '@/lib/availability';
import { toUserMessage } from '@/lib/errors';
import { formatDuration, formatPrice, formatTime } from '@/lib/format';
import { useBarber, useBookAppointment, useDayAppointments, useServices } from '@/lib/queries';

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

export default function BookScreen() {
  const router = useRouter();
  const { serviceId, barberId } = useLocalSearchParams<{ serviceId: string; barberId: string }>();
  const { profile } = useSession();

  const days = useMemo(() => nextDays(DAYS_AHEAD), []);
  const [day, setDay] = useState<Date>(days[0]);
  const [selected, setSelected] = useState<Date | null>(null);

  const barberQ = useBarber(barberId);
  const servicesQ = useServices(barberId);
  const dayApptsQ = useDayAppointments(barberId, day);
  const book = useBookAppointment();

  const service = servicesQ.data?.find((s) => s.id === serviceId);

  const slots = useMemo(() => {
    if (!barberQ.data || !service) return [];
    return generateSlots(day, barberQ.data.workingHours, service.duration_minutes, dayApptsQ.data ?? []);
  }, [barberQ.data, service, day, dayApptsQ.data]);

  if (barberQ.isLoading || servicesQ.isLoading) return <Screen><Loading /></Screen>;
  if (barberQ.isError || !service)
    return <Screen><ErrorState message="Não foi possível carregar os detalhes do agendamento." /></Screen>;

  async function onConfirm() {
    if (!selected || !service || !profile) return;
    const end = new Date(selected.getTime() + service.duration_minutes * 60_000);
    try {
      await book.mutateAsync({
        customerId: profile.id,
        barberId,
        serviceId,
        start: selected,
        end,
      });
      Alert.alert('Agendado!', 'Sua solicitação de agendamento foi enviada.');
      router.replace('/appointments');
    } catch (e) {
      Alert.alert('Não foi possível agendar', toUserMessage(e));
    }
  }

  return (
    <Screen edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <ThemedText type="title">{service.name}</ThemedText>
          <ThemedText muted>
            {formatDuration(service.duration_minutes)} · {formatPrice(service.price_cents)}
          </ThemedText>
        </Card>

        <View style={styles.section}>
          <ThemedText type="label" muted>
            DATA
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
            {days.map((d) => (
              <Chip
                key={d.toISOString()}
                label={d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' })}
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
            HORÁRIO
          </ThemedText>
          {dayApptsQ.isLoading ? (
            <Loading />
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
          title={selected ? `Confirmar ${formatTime(selected.toISOString())}` : 'Selecione um horário'}
          fullWidth
          disabled={!selected}
          loading={book.isPending}
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
