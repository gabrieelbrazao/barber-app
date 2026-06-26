import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Divider, ErrorState, Loading, Screen, ScreenHeader, TextField } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session';
import type { WorkingHours } from '@/lib/database.types';
import { qk, useBarber } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/hooks/use-colors';

const DAYS: { key: keyof WorkingHours; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

export default function BarberProfileScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { profile, signOut, refreshProfile } = useSession();
  const barberId = profile?.id ?? '';
  const barberQ = useBarber(barberId);

  const [shopName, setShopName] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [hours, setHours] = useState<WorkingHours | null>(null);
  const [saving, setSaving] = useState(false);

  // Seed local state once the query resolves.
  if (barberQ.data && shopName === null && hours === null) {
    setShopName(barberQ.data.shopName ?? '');
    setLocation(barberQ.data.location ?? '');
    setBio(barberQ.data.bio ?? '');
    setHours(barberQ.data.workingHours ?? {});
  }

  if (barberQ.isLoading) return <Screen><Loading /></Screen>;
  if (barberQ.isError) return <Screen><ErrorState message="Couldn't load your shop." /></Screen>;

  function setDayOpen(key: keyof WorkingHours, open: boolean) {
    setHours((h) => ({ ...h, [key]: open ? ['09:00', '18:00'] : null }));
  }
  function setDayTime(key: keyof WorkingHours, idx: 0 | 1, value: string) {
    setHours((h) => {
      const current = h?.[key] ?? ['09:00', '18:00'];
      const next: [string, string] = [...current] as [string, string];
      next[idx] = value;
      return { ...h, [key]: next };
    });
  }

  async function onSave() {
    if (!profile) return;
    setSaving(true);
    try {
      const { error: pErr } = await supabase
        .from('profiles')
        .update({ full_name: profile.full_name })
        .eq('id', profile.id);
      if (pErr) throw pErr;

      const { error: bErr } = await supabase
        .from('barber_profiles')
        .update({
          shop_name: shopName?.trim() || null,
          location: location?.trim() || null,
          bio: bio?.trim() || null,
          working_hours: hours ?? {},
        })
        .eq('id', profile.id);
      if (bErr) throw bErr;

      await refreshProfile();
      qc.invalidateQueries({ queryKey: qk.barber(profile.id) });
      qc.invalidateQueries({ queryKey: qk.barbers });
      Alert.alert('Saved', 'Your shop details have been updated.');
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="Shop profile" />

        <View style={styles.form}>
          <TextField label="Shop name" value={shopName ?? ''} onChangeText={setShopName} />
          <TextField label="Location" value={location ?? ''} onChangeText={setLocation} placeholder="Neighborhood / city" />
          <TextField
            label="Bio"
            value={bio ?? ''}
            onChangeText={setBio}
            placeholder="Tell clients about your work"
            multiline
          />
        </View>

        <Card>
          <ThemedText type="subtitle" style={styles.hoursTitle}>
            Working hours
          </ThemedText>
          {DAYS.map(({ key, label }) => {
            const range = hours?.[key];
            const isOpen = !!range;
            return (
              <View key={key} style={styles.dayRow}>
                <View style={styles.dayLabel}>
                  <Switch
                    value={isOpen}
                    onValueChange={(v) => setDayOpen(key, v)}
                    trackColor={{ true: c.accent, false: c.border }}
                  />
                  <ThemedText type="label">{label}</ThemedText>
                </View>
                {isOpen ? (
                  <View style={styles.times}>
                    <TimeInput value={range[0]} onChangeText={(t) => setDayTime(key, 0, t)} />
                    <ThemedText muted>–</ThemedText>
                    <TimeInput value={range[1]} onChangeText={(t) => setDayTime(key, 1, t)} />
                  </View>
                ) : (
                  <ThemedText type="caption" muted>
                    Closed
                  </ThemedText>
                )}
              </View>
            );
          })}
        </Card>

        <Button title="Save shop" fullWidth loading={saving} onPress={onSave} />

        <Divider spacing={Spacing.sm} />
        <Button title="Sign out" variant="ghost" fullWidth onPress={() => signOut()} />
      </ScrollView>
    </Screen>
  );
}

function TimeInput({ value, onChangeText }: { value: string; onChangeText: (t: string) => void }) {
  const c = useColors();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder="09:00"
      placeholderTextColor={c.textMuted}
      maxLength={5}
      style={[styles.timeInput, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  form: {
    gap: Spacing.lg,
  },
  hoursTitle: {
    marginBottom: Spacing.md,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  dayLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  times: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  timeInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    width: 64,
    textAlign: 'center',
    fontSize: 15,
  },
});
