import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Screen, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session';
import { toUserMessage } from '@/lib/errors';
import { hapticError, hapticSuccess } from '@/lib/haptics';
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
  const [price, setPrice] = useState(existing ? maskCurrency(String(existing.price_cents)) : '');
  const [duration, setDuration] = useState(existing ? String(existing.duration_minutes) : '');
  const [deposit, setDeposit] = useState(
    existing?.deposit_cents ? maskCurrency(String(existing.deposit_cents)) : ''
  );
  const [active, setActive] = useState(existing?.active ?? true);

  // The masked value mirrors its digits as cents (e.g. "35,00" -> 3500).
  const priceCents = parseInt(price.replace(/\D/g, '') || '0', 10);
  const depositCents = parseInt(deposit.replace(/\D/g, '') || '0', 10);
  const durationMinutes = parseInt(duration, 10);
  const valid = name.trim() && price.length > 0 && durationMinutes > 0;

  async function onSave() {
    if (!valid) return;
    try {
      await save.mutateAsync({
        id: serviceId,
        name: name.trim(),
        priceCents,
        durationMinutes,
        depositCents,
        active,
      });
      hapticSuccess();
      router.back();
    } catch (e) {
      hapticError();
      Alert.alert('Não foi possível salvar', toUserMessage(e));
    }
  }

  return (
    <Screen edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText type="title">{serviceId ? 'Editar serviço' : 'Novo serviço'}</ThemedText>

        <TextField label="Nome" placeholder="Corte Clássico" value={name} onChangeText={setName} />
        <TextField
          label="Preço"
          placeholder="0,00"
          keyboardType="number-pad"
          value={price}
          onChangeText={(t) => setPrice(maskCurrency(t))}
          left={<ThemedText muted>R$</ThemedText>}
        />
        <TextField
          label="Duração (minutos)"
          placeholder="45"
          keyboardType="number-pad"
          value={duration}
          onChangeText={setDuration}
        />
        <TextField
          label="Sinal (opcional)"
          placeholder="0,00"
          keyboardType="number-pad"
          value={deposit}
          onChangeText={(t) => setDeposit(maskCurrency(t))}
          left={<ThemedText muted>R$</ThemedText>}
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
      </KeyboardAvoidingView>
    </Screen>
  );
}

/** Treats the typed digits as cents and renders them as "1.234,56" (no thousands sep needed for typical prices). */
function maskCurrency(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  return (parseInt(digits, 10) / 100).toFixed(2).replace('.', ',');
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
