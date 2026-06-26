import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button, Chip, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session';
import type { UserRole } from '@/lib/database.types';
import { useColors } from '@/hooks/use-colors';

export default function SignUpScreen() {
  const c = useColors();
  const { signUp } = useSession();

  const [role, setRole] = useState<UserRole>('customer');
  const [fullName, setFullName] = useState('');
  const [shopName, setShopName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = fullName && email && password.length >= 6 && (role === 'customer' || shopName);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const { needsConfirmation } = await signUp({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        role,
        shopName: role === 'barber' ? shopName.trim() : undefined,
      });
      if (needsConfirmation) {
        Alert.alert(
          'Check your email',
          'Confirm your address, then come back and sign in.'
        );
      }
      // With auto-confirm on, the session arrives and the root guard routes us in.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create account.');
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
            <ThemedText type="display">Create account</ThemedText>
            <ThemedText muted>Join as a client or set up your barber shop.</ThemedText>
          </View>

          <View>
            <ThemedText type="label" style={styles.roleLabel}>
              I am a
            </ThemedText>
            <View style={styles.roles}>
              <Chip label="Customer" selected={role === 'customer'} onPress={() => setRole('customer')} />
              <Chip label="Barber" selected={role === 'barber'} onPress={() => setRole('barber')} />
            </View>
          </View>

          <View style={styles.form}>
            <TextField label="Full name" placeholder="Jane Doe" value={fullName} onChangeText={setFullName} />
            {role === 'barber' ? (
              <TextField
                label="Shop name"
                placeholder="The Sharp Edge"
                value={shopName}
                onChangeText={setShopName}
              />
            ) : null}
            <TextField
              label="Email"
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
            <TextField
              label="Password"
              placeholder="At least 6 characters"
              secureTextEntry
              autoComplete="new-password"
              value={password}
              onChangeText={setPassword}
              error={error ?? undefined}
            />
            <Button
              title="Create account"
              fullWidth
              loading={submitting}
              disabled={!canSubmit}
              onPress={onSubmit}
            />
          </View>

          <View style={styles.footer}>
            <ThemedText muted>Already have an account? </ThemedText>
            <Link href="/sign-in" replace>
              <ThemedText type="link" style={{ color: c.accent }}>
                Sign in
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
