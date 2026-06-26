import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Screen, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session';
import { toUserMessage } from '@/lib/errors';
import { useSaveService, useServices } from '@/lib/queries';
import { useColors } from '@/hooks/use-colors';

export default function EditServiceScreen() {
  const c = useColors();
  const router = useRouter();
  const { serviceId } = useLocalSearchParams<{ serviceId?: string }>();
  const { profile } = useSession();
  const barberId = profile?.id ?? '';

  const { data: services } = useServices(barberId, true);
  const existing = serviceId ? services?.find((s) => s.id === serviceId) : undefined;
  const save = useSaveService(barberId);

  const [name, setName] = useState(existing?.name ?? '');
  const [price, setPrice] = useState(
    existing ? (existing.price_cents / 100).toFixed(2).replace('.', ',') : ''
  );
  const [duration, setDuration] = useState(existing ? String(existing.duration_minutes) : '');
  const [active, setActive] = useState(existing?.active ?? true);

  const priceCents = Math.round(parseFloat(price.replace(',', '.')) * 100);
  const durationMinutes = parseInt(duration, 10);
  const valid = name.trim() && priceCents >= 0 && durationMinutes > 0;

  async function onSave() {
    if (!valid) return;
    try {
      await save.mutateAsync({
        id: serviceId,
        name: name.trim(),
        priceCents,
        durationMinutes,
        active,
      });
      router.back();
    } catch (e) {
      Alert.alert('Não foi possível salvar', toUserMessage(e));
    }
  }

  return (
    <Screen edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">{serviceId ? 'Editar serviço' : 'Novo serviço'}</ThemedText>

        <TextField label="Nome" placeholder="Corte Clássico" value={name} onChangeText={setName} />
        <TextField
          label="Preço (R$)"
          placeholder="35,00"
          keyboardType="decimal-pad"
          value={price}
          onChangeText={setPrice}
        />
        <TextField
          label="Duração (minutos)"
          placeholder="45"
          keyboardType="number-pad"
          value={duration}
          onChangeText={setDuration}
        />

        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <ThemedText type="label">Visível para clientes</ThemedText>
            <ThemedText type="caption" muted>
              Serviços ocultos não podem ser agendados.
            </ThemedText>
          </View>
          <Switch
            value={active}
            onValueChange={setActive}
            trackColor={{ true: c.accent, false: c.border }}
          />
        </View>

        <Button
          title={serviceId ? 'Salvar alterações' : 'Adicionar serviço'}
          fullWidth
          disabled={!valid}
          loading={save.isPending}
          onPress={onSave}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  toggleText: {
    flex: 1,
    gap: 2,
  },
});
