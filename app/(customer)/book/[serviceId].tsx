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
  SlotsSkeleton,
  TextField,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session';
import { generateSlots } from '@/lib/availability';
import { toUserMessage } from '@/lib/errors';
import { formatDuration, formatPrice, formatTime } from '@/lib/format';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { scheduleReminder } from '@/lib/notifications';
import {
  useBarber,
  useBookAppointment,
  useDayAppointments,
  useDayBlocks,
  useJoinWaitlist,
  useRedeemPromo,
  useServices,
  type RedeemedPromo,
} from '@/lib/queries';
import { promoDiscountCents } from '@/lib/promo';

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

export default function BookScreen() {
  const router = useRouter();
  const { serviceId, barberId } = useLocalSearchParams<{ serviceId: string; barberId: string }>();
  const { profile } = useSession();

  const days = useMemo(() => nextDays(DAYS_AHEAD), []);
  const [day, setDay] = useState<Date>(days[0]);
  const [selected, setSelected] = useState<Date | null>(null);
  const [promoText, setPromoText] = useState('');
  const [promo, setPromo] = useState<RedeemedPromo | null>(null);
  const redeem = useRedeemPromo();

  const barberQ = useBarber(barberId);
  const servicesQ = useServices(barberId);
  const dayApptsQ = useDayAppointments(barberId, day);
  const dayBlocksQ = useDayBlocks(barberId, day);
  const book = useBookAppointment();
  const joinWaitlist = useJoinWaitlist();

  const service = servicesQ.data?.find((s) => s.id === serviceId);

  const slots = useMemo(() => {
    if (!barberQ.data || !service) return [];
    return generateSlots(
      day,
      barberQ.data.workingHours,
      service.duration_minutes,
      dayApptsQ.data ?? [],
      dayBlocksQ.data ?? []
    );
  }, [barberQ.data, service, day, dayApptsQ.data, dayBlocksQ.data]);

  if (barberQ.isLoading || servicesQ.isLoading) return <Screen><Loading /></Screen>;
  if (barberQ.isError || !service)
    return <Screen><ErrorState message="Não foi possível carregar os detalhes do agendamento." /></Screen>;

  const discountCents =
    service && promo ? promoDiscountCents(service.price_cents, promo.kind, promo.value) : 0;

  const hasAvailable = slots.some((s) => s.available);

  async function onJoinWaitlist() {
    if (!profile) return;
    try {
      await joinWaitlist.mutateAsync({
        customerId: profile.id,
        barberId,
        serviceId,
        desiredDate: day,
      });
      hapticSuccess();
      Alert.alert('Na lista!', 'Avisaremos a barbearia do seu interesse para este dia.');
    } catch (e) {
      hapticError();
      Alert.alert('Não foi possível entrar na lista', toUserMessage(e));
    }
  }

  async function onApplyPromo() {
    if (!promoText.trim()) return;
    try {
      const r = await redeem.mutateAsync(promoText);
      if (r) {
        setPromo(r);
        hapticSuccess();
      } else {
        setPromo(null);
        Alert.alert('Cupom inválido', 'Verifique o código e tente novamente.');
      }
    } catch (e) {
      Alert.alert('Não foi possível aplicar o cupom', toUserMessage(e));
    }
  }

  async function onConfirm() {
    if (!selected || !service || !profile) return;
    const end = new Date(selected.getTime() + service.duration_minutes * 60_000);
    try {
      const appointmentId = await book.mutateAsync({
        customerId: profile.id,
        barberId,
        serviceId,
        start: selected,
        end,
        promoCodeId: promo?.promoId ?? null,
        discountCents,
      });
      // Best-effort local reminder; never block the booking on it.
      scheduleReminder({
        appointmentId,
        startISO: selected.toISOString(),
        title: 'Lembrete de agendamento',
        body: `${service.name} às ${formatTime(selected.toISOString())} com ${barberQ.data?.name ?? 'seu barbeiro'}.`,
      }).catch(() => {});
      hapticSuccess();
      Alert.alert('Agendado!', 'Sua solicitação de agendamento foi enviada.');
      router.replace('/appointments');
    } catch (e) {
      hapticError();
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
          {service.deposit_cents > 0 ? (
            <ThemedText type="caption" muted style={styles.deposit}>
              Sinal de {formatPrice(service.deposit_cents)} para confirmar
            </ThemedText>
          ) : null}
          {discountCents > 0 ? (
            <ThemedText type="label" style={styles.deposit}>
              Cupom aplicado: −{formatPrice(discountCents)} (total{' '}
              {formatPrice(service.price_cents - discountCents)})
            </ThemedText>
          ) : null}
        </Card>

        <View style={styles.section}>
          <ThemedText type="label" muted>
            CUPOM
          </ThemedText>
          <View style={styles.promoRow}>
            <View style={styles.promoField}>
              <TextField
                value={promoText}
                onChangeText={setPromoText}
                placeholder="Código promocional"
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>
            <Button
              title="Aplicar"
              variant="secondary"
              size="sm"
              loading={redeem.isPending}
              disabled={!promoText.trim()}
              onPress={onApplyPromo}
            />
          </View>
        </View>

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
            HORÁRIO
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
          {!dayApptsQ.isLoading && !hasAvailable ? (
            <Button
              title="Entrar na lista de espera"
              variant="secondary"
              loading={joinWaitlist.isPending}
              onPress={onJoinWaitlist}
            />
          ) : null}
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
  deposit: {
    marginTop: Spacing.xs,
  },
  promoRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  promoField: {
    flex: 1,
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
