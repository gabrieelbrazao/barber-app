import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar, Button, Card, Divider, Screen, ScreenHeader, TextField, ThemeModeToggle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session';
import { toUserMessage } from '@/lib/errors';
import { maskPhoneBR } from '@/lib/format';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';

export default function CustomerProfileScreen() {
  const { session, profile, signOut, refreshProfile } = useSession();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(maskPhoneBR(profile?.phone ?? ''));
  const [saving, setSaving] = useState(false);

  const dirty =
    fullName.trim() !== (profile?.full_name ?? '') ||
    (phone.trim() || null) !== (profile?.phone ?? null);

  function onSignOut() {
    Alert.alert('Sair da conta?', 'Você precisará entrar novamente.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  async function onSave() {
    if (!profile || !dirty) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), phone: phone.trim() || null })
        .eq('id', profile.id);
      if (error) throw error;
      await refreshProfile();
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
        <ScreenHeader title="Perfil" />

        <Card>
          <View style={styles.identity}>
            <Avatar name={fullName || profile?.full_name} size={64} />
            <View style={styles.identityText}>
              <ThemedText type="subtitle">{profile?.full_name || 'Sua conta'}</ThemedText>
              <ThemedText type="caption" muted>
                {session?.user.email}
              </ThemedText>
            </View>
          </View>
        </Card>

        <View style={styles.form}>
          <TextField label="Nome completo" value={fullName} onChangeText={setFullName} />
          <TextField
            label="Telefone"
            value={phone}
            onChangeText={(t) => setPhone(maskPhoneBR(t))}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            maxLength={15}
            placeholder="(11) 99999-9999"
          />
          <Button
            title={dirty ? 'Salvar alterações' : 'Tudo salvo'}
            fullWidth
            loading={saving}
            disabled={!dirty}
            onPress={onSave}
          />
        </View>

        <Divider spacing={Spacing.sm} />
        <ThemeModeToggle />
        <Divider spacing={Spacing.sm} />
        <Button title="Sair" variant="ghost" fullWidth onPress={onSignOut} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  identityText: {
    flex: 1,
    gap: 2,
  },
  form: {
    gap: Spacing.lg,
  },
});
