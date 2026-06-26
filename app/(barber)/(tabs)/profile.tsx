import DateTimePicker from '@react-native-community/datetimepicker';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Divider, ErrorState, Loading, Screen, ScreenHeader, TextField, ThemeModeToggle } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session';
import type { WorkingHours } from '@/lib/database.types';
import { toUserMessage } from '@/lib/errors';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { qk, useBarber } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/hooks/use-colors';

const DAYS: { key: keyof WorkingHours; label: string }[] = [
  { key: 'mon', label: 'Segunda-feira' },
  { key: 'tue', label: 'Terça-feira' },
  { key: 'wed', label: 'Quarta-feira' },
  { key: 'thu', label: 'Quinta-feira' },
  { key: 'fri', label: 'Sexta-feira' },
  { key: 'sat', label: 'Sábado' },
  { key: 'sun', label: 'Domingo' },
];

// 24-hour HH:MM. Zero-padded so plain string comparison orders times correctly.
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Returns the first validation error across open days, or null when all are valid. */
function validateHours(hours: WorkingHours): string | null {
  for (const { key, label } of DAYS) {
    const range = hours[key];
    if (!range) continue;
    const [open, close] = range;
    if (!HHMM.test(open) || !HHMM.test(close)) {
      return `${label}: informe os horários como HH:MM (24 horas), ex.: 09:00.`;
    }
    if (open >= close) {
      return `${label}: o horário de abertura deve ser anterior ao de fechamento.`;
    }
  }
  return null;
}

export default function BarberProfileScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { profile, signOut, refreshProfile } = useSession();
  const barberId = profile?.id ?? '';
  const barberQ = useBarber(barberId);

  const [title, setTitle] = useState<string | null>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [hours, setHours] = useState<WorkingHours | null>(null);
  const [saving, setSaving] = useState(false);

  // Seed local state once the query resolves.
  if (barberQ.data && title === null && hours === null) {
    setTitle(barberQ.data.title ?? '');
    setBio(barberQ.data.bio ?? '');
    setHours(barberQ.data.workingHours ?? {});
  }

  if (barberQ.isLoading) return <Screen><Loading /></Screen>;
  if (barberQ.isError) return <Screen><ErrorState message="Não foi possível carregar seu perfil." /></Screen>;

  const saved = barberQ.data;
  const dirty =
    !!saved &&
    ((title ?? '') !== (saved.title ?? '') ||
      (bio ?? '') !== (saved.bio ?? '') ||
      JSON.stringify(hours ?? {}) !== JSON.stringify(saved.workingHours ?? {}));

  function onSignOut() {
    Alert.alert('Sair da conta?', 'Você precisará entrar novamente.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => signOut() },
    ]);
  }

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
    if (!profile || !dirty) return;
    const hoursError = validateHours(hours ?? {});
    if (hoursError) {
      Alert.alert('Horário de funcionamento inválido', hoursError);
      return;
    }
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
          title: title?.trim() || null,
          bio: bio?.trim() || null,
          working_hours: hours ?? {},
        })
        .eq('id', profile.id);
      if (bErr) throw bErr;

      await refreshProfile();
      qc.invalidateQueries({ queryKey: qk.barber(profile.id) });
      qc.invalidateQueries({ queryKey: qk.barbers });
      hapticSuccess();
      Alert.alert('Salvo', 'Seu perfil foi atualizado.');
    } catch (e) {
      hapticError();
      Alert.alert('Não foi possível salvar', toUserMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Meu perfil" />

        <View style={styles.form}>
          <TextField
            label="Cargo"
            value={title ?? ''}
            onChangeText={setTitle}
            placeholder="Ex.: Barbeiro Sênior"
          />
          <TextField
            label="Bio"
            value={bio ?? ''}
            onChangeText={setBio}
            placeholder="Conte aos clientes sobre seu trabalho"
            multiline
          />
        </View>

        <Card>
          <ThemedText type="subtitle" style={styles.hoursTitle}>
            Horário de funcionamento
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
                    <TimeField value={range[0]} onChange={(t) => setDayTime(key, 0, t)} />
                    <ThemedText muted>–</ThemedText>
                    <TimeField value={range[1]} onChange={(t) => setDayTime(key, 1, t)} />
                  </View>
                ) : (
                  <ThemedText type="caption" muted>
                    Fechado
                  </ThemedText>
                )}
              </View>
            );
          })}
        </Card>

        <Button
          title={dirty ? 'Salvar perfil' : 'Tudo salvo'}
          fullWidth
          loading={saving}
          disabled={!dirty}
          onPress={onSave}
        />

        <Divider spacing={Spacing.sm} />
        <ThemeModeToggle />
        <Divider spacing={Spacing.sm} />
        <Button title="Sair" variant="ghost" fullWidth onPress={onSignOut} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/** Tappable time chip backed by the native time picker — no manual HH:MM typing. */
function TimeField({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const c = useColors();
  const [open, setOpen] = useState(false);

  const [h, m] = value.split(':');
  const base = new Date();
  base.setHours(Number(h) || 0, Number(m) || 0, 0, 0);

  function commit(d: Date) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    onChange(`${hh}:${mm}`);
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.timeInput, { borderColor: c.border, backgroundColor: c.surface }]}>
        <ThemedText style={{ color: c.text, fontSize: 15 }}>{value}</ThemedText>
      </Pressable>

      {/* Android shows a dialog that fires once with the result. */}
      {open && Platform.OS !== 'ios' && (
        <DateTimePicker
          value={base}
          mode="time"
          is24Hour
          onChange={(e, d) => {
            setOpen(false);
            if (e.type === 'set' && d) commit(d);
          }}
        />
      )}

      {/* iOS spinner lives in a small confirm sheet. */}
      {Platform.OS === 'ios' && (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
            <Pressable style={[styles.sheet, { backgroundColor: c.surface }]}>
              <DateTimePicker
                value={base}
                mode="time"
                is24Hour
                display="spinner"
                textColor={c.text}
                onChange={(_e, d) => d && commit(d)}
              />
              <Button title="Concluir" fullWidth onPress={() => setOpen(false)} />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
    width: 64,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    gap: Spacing.md,
  },
});
