import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button, Icon, IconButton, TextField } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session';
import { toUserMessage } from '@/lib/errors';
import { useColors } from '@/hooks/use-colors';

export default function SignInScreen() {
  const c = useColors();
  const { signIn } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
      // The root guard swaps the navigator to the role's tabs automatically.
    } catch (e) {
      setError(toUserMessage(e, 'Não foi possível entrar.'));
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
          <View style={styles.brand}>
            <Icon name="cut" size={40} color={c.accent} />
            <ThemedText type="display">Bem-vindo de volta</ThemedText>
            <ThemedText muted>Entre para agendar seu próximo corte.</ThemedText>
          </View>

          <View style={styles.form}>
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
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              autoComplete="current-password"
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
              title="Entrar"
              fullWidth
              loading={submitting}
              disabled={!email || !password}
              onPress={onSubmit}
            />
          </View>

          <View style={styles.footer}>
            <ThemedText muted>Novo por aqui? </ThemedText>
            <Link href="/sign-up" replace>
              <ThemedText type="link" style={{ color: c.accent }}>
                Criar uma conta
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
    gap: Spacing.xxl,
  },
  brand: {
    alignItems: 'center',
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
