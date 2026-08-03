import DateTimePicker from '@react-native-community/datetimepicker';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
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
import { Button, Card, Divider, EmptyState, ErrorState, IconButton, Loading, Screen, ScreenHeader, TextField, ThemeModeToggle } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { SHOP_ID } from '@/lib/config';
import { useSession } from '@/contexts/session';
import type { WorkingHours } from '@/lib/database.types';
import { toUserMessage } from '@/lib/errors';
import { formatDate, formatTime } from '@/lib/format';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import {
  qk,
  useAddPortfolioImage,
  useBarber,
  useBarberPortfolio,
  useBarberTimeOff,
  useDeletePortfolioImage,
  useDeleteTimeOff,
  useSaveTimeOff,
} from '@/lib/queries';
import { portfolioObjectPath } from '@/lib/shop';
import { pickImage, uploadImage } from '@/lib/uploads';
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
        behavior="padding">
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

        <TimeOffManager barberId={barberId} />

        <PortfolioManager barberId={barberId} />

        <Divider spacing={Spacing.sm} />
        <ThemeModeToggle />
        <Divider spacing={Spacing.sm} />
        <Button title="Sair" variant="ghost" fullWidth onPress={onSignOut} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/** Barber-managed one-off blocks (lunch, appointments, a day off) that hide slots. */
function TimeOffManager({ barberId }: { barberId: string }) {
  const c = useColors();
  const listQ = useBarberTimeOff(barberId);
  const save = useSaveTimeOff(barberId);
  const del = useDeleteTimeOff(barberId);

  const [date, setDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [start, setStart] = useState('12:00');
  const [end, setEnd] = useState('13:00');
  const [showDate, setShowDate] = useState(false);

  function combine(d: Date, hhmm: string): Date {
    const [h, m] = hhmm.split(':').map(Number);
    const out = new Date(d);
    out.setHours(h, m, 0, 0);
    return out;
  }

  async function onAdd() {
    const startsAt = combine(date, start);
    const endsAt = combine(date, end);
    if (endsAt <= startsAt) {
      Alert.alert('Horário inválido', 'O fim deve ser depois do início.');
      return;
    }
    try {
      await save.mutateAsync({ startsAt, endsAt, reason: null });
      hapticSuccess();
    } catch (e) {
      hapticError();
      Alert.alert('Não foi possível salvar', toUserMessage(e));
    }
  }

  return (
    <Card>
      <ThemedText type="subtitle" style={styles.hoursTitle}>
        Folgas e bloqueios
      </ThemedText>

      <View style={styles.dayRow}>
        <ThemedText type="label">Data</ThemedText>
        <Pressable
          onPress={() => setShowDate(true)}
          style={[styles.timeInput, { borderColor: c.border, backgroundColor: c.surface, width: 'auto', paddingHorizontal: Spacing.md }]}>
          <ThemedText style={{ color: c.text, fontSize: 15 }}>{formatDate(date.toISOString())}</ThemedText>
        </Pressable>
      </View>
      {showDate && (
        <DateTimePicker
          value={date}
          mode="date"
          minimumDate={new Date(new Date().setHours(0, 0, 0, 0))}
          onChange={(e, d) => {
            setShowDate(false);
            if (e.type === 'set' && d) {
              d.setHours(0, 0, 0, 0);
              setDate(d);
            }
          }}
        />
      )}

      <View style={styles.dayRow}>
        <ThemedText type="label">Período</ThemedText>
        <View style={styles.times}>
          <TimeField value={start} onChange={setStart} />
          <ThemedText muted>–</ThemedText>
          <TimeField value={end} onChange={setEnd} />
        </View>
      </View>

      <Button
        title="Adicionar bloqueio"
        variant="secondary"
        size="sm"
        loading={save.isPending}
        onPress={onAdd}
      />

      <Divider spacing={Spacing.sm} />

      {listQ.isLoading ? (
        <Loading />
      ) : (listQ.data?.length ?? 0) === 0 ? (
        <EmptyState icon="time-outline" title="Sem bloqueios" message="Você está disponível conforme o horário acima." />
      ) : (
        listQ.data!.map((t) => (
          <View key={t.id} style={styles.blockRow}>
            <View style={styles.blockInfo}>
              <ThemedText type="label">{formatDate(t.starts_at)}</ThemedText>
              <ThemedText type="caption" muted>
                {formatTime(t.starts_at)} – {formatTime(t.ends_at)}
              </ThemedText>
            </View>
            <IconButton
              name="trash-outline"
              color={c.cancelled}
              accessibilityLabel="Remover bloqueio"
              onPress={() => del.mutate(t.id)}
            />
          </View>
        ))
      )}
    </Card>
  );
}

/** Barber-managed gallery of past work, shown to customers on the barber detail screen. */
function PortfolioManager({ barberId }: { barberId: string }) {
  const c = useColors();
  const listQ = useBarberPortfolio(barberId);
  const add = useAddPortfolioImage(barberId);
  const del = useDeletePortfolioImage(barberId);
  const [uploading, setUploading] = useState(false);

  async function onAdd() {
    const image = await pickImage();
    if (!image) return;
    setUploading(true);
    try {
      const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const url = await uploadImage({
        bucket: 'portfolio',
        path: portfolioObjectPath(SHOP_ID, barberId, key),
        image,
      });
      await add.mutateAsync({ imageUrl: url, sortOrder: listQ.data?.length ?? 0 });
      hapticSuccess();
    } catch (e) {
      hapticError();
      Alert.alert('Não foi possível enviar a foto', toUserMessage(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <View style={styles.portfolioHead}>
        <ThemedText type="subtitle">Portfólio</ThemedText>
        <Button title="Adicionar foto" variant="secondary" size="sm" loading={uploading} onPress={onAdd} />
      </View>

      {(listQ.data?.length ?? 0) === 0 ? (
        <EmptyState icon="images-outline" title="Sem fotos" message="Mostre seus melhores cortes." />
      ) : (
        <View style={styles.gallery}>
          {listQ.data!.map((img) => (
            <View key={img.id} style={styles.thumbWrap}>
              <Image source={{ uri: img.image_url }} style={styles.thumb} contentFit="cover" />
              <View style={styles.thumbDelete}>
                <IconButton
                  name="close-circle"
                  size={22}
                  color={c.cancelled}
                  accessibilityLabel="Remover foto"
                  onPress={() => del.mutate(img.id)}
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
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
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  blockInfo: {
    gap: 2,
  },
  portfolioHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  thumbWrap: {
    position: 'relative',
  },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: Radius.md,
  },
  thumbDelete: {
    position: 'absolute',
    top: -8,
    right: -8,
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
