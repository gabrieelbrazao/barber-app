import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button, Chip, Icon, IconButton, TextField } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session';
import type { UserRole } from '@/lib/database.types';
import { toUserMessage } from '@/lib/errors';
import { useColors } from '@/hooks/use-colors';

export default function SignUpScreen() {
  const c = useColors();
  const { signUp } = useSession();

  const [role, setRole] = useState<UserRole>('customer');
  const [fullName, setFullName] = useState('');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = fullName && email && password.length >= 6;

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const { needsConfirmation } = await signUp({
        email: email.trim().toLowerCase(),
        password,
        fullName: fullName.trim(),
        role,
        title: role === 'barber' ? title.trim() || undefined : undefined,
      });
      if (needsConfirmation) {
        Alert.alert(
          'Verifique seu e-mail',
          'Confirme seu endereço e depois volte para entrar.'
        );
      }
      // With auto-confirm on, the session arrives and the root guard routes us in.
    } catch (e) {
      setError(toUserMessage(e, 'Não foi possível criar a conta.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.head}>
            <ThemedText type="display">Criar conta</ThemedText>
            <ThemedText muted>Cadastre-se como cliente ou membro da equipe.</ThemedText>
          </View>

          <View>
            <ThemedText type="label" style={styles.roleLabel}>
              Eu sou
            </ThemedText>
            <View style={styles.roles}>
              <Chip label="Cliente" selected={role === 'customer'} onPress={() => setRole('customer')} />
              <Chip label="Barbeiro" selected={role === 'barber'} onPress={() => setRole('barber')} />
            </View>
          </View>

          <View style={styles.form}>
            <TextField label="Nome completo" placeholder="João Silva" value={fullName} onChangeText={setFullName} />
            {role === 'barber' ? (
              <TextField
                label="Cargo"
                placeholder="Ex.: Barbeiro Sênior"
                value={title}
                onChangeText={setTitle}
              />
            ) : null}
            <TextField
              label="E-mail"
              placeholder="voce@exemplo.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
            <TextField
              label="Senha"
              placeholder="Pelo menos 6 caracteres"
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              value={password}
              onChangeText={setPassword}
              right={
                <IconButton
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  color={c.textMuted}
                  accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  onPress={() => setShowPassword((s) => !s)}
                />
              }
            />
            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: c.surfaceAlt, borderColor: c.cancelled }]}>
                <Icon name="alert-circle-outline" size={18} color={c.cancelled} />
                <ThemedText style={{ color: c.cancelled, flex: 1 }}>{error}</ThemedText>
              </View>
            ) : null}
            <Button
              title="Criar conta"
              fullWidth
              loading={submitting}
              disabled={!canSubmit}
              onPress={onSubmit}
            />
          </View>

          <View style={styles.footer}>
            <ThemedText muted>Já tem uma conta? </ThemedText>
            <Link href="/sign-in" replace>
              <ThemedText type="link" style={{ color: c.accent }}>
                Entrar
              </ThemedText>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  head: {
    gap: Spacing.xs,
  },
  roleLabel: {
    marginBottom: Spacing.sm,
  },
  roles: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  form: {
    gap: Spacing.lg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
