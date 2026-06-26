import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Screen, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session';
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
  const [price, setPrice] = useState(existing ? (existing.price_cents / 100).toFixed(2) : '');
  const [duration, setDuration] = useState(existing ? String(existing.duration_minutes) : '');
  const [active, setActive] = useState(existing?.active ?? true);

  const priceCents = Math.round(parseFloat(price) * 100);
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
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
    }
  }

  return (
    <Screen edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">{serviceId ? 'Edit service' : 'New service'}</ThemedText>

        <TextField label="Name" placeholder="Classic Cut" value={name} onChangeText={setName} />
        <TextField
          label="Price (USD)"
          placeholder="35.00"
          keyboardType="decimal-pad"
          value={price}
          onChangeText={setPrice}
        />
        <TextField
          label="Duration (minutes)"
          placeholder="45"
          keyboardType="number-pad"
          value={duration}
          onChangeText={setDuration}
        />

        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <ThemedText type="label">Visible to customers</ThemedText>
            <ThemedText type="caption" muted>
              Hidden services can&apos;t be booked.
            </ThemedText>
          </View>
          <Switch
            value={active}
            onValueChange={setActive}
            trackColor={{ true: c.accent, false: c.border }}
          />
        </View>

        <Button
          title={serviceId ? 'Save changes' : 'Add service'}
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
