import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar, Button, Card, Divider, Screen, ScreenHeader, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session';
import { supabase } from '@/lib/supabase';

export default function CustomerProfileScreen() {
  const { session, profile, signOut, refreshProfile } = useSession();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), phone: phone.trim() || null })
        .eq('id', profile.id);
      if (error) throw error;
      await refreshProfile();
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="Profile" />

        <Card>
          <View style={styles.identity}>
            <Avatar name={fullName || profile?.full_name} size={64} />
            <View style={styles.identityText}>
              <ThemedText type="subtitle">{profile?.full_name || 'Your account'}</ThemedText>
              <ThemedText type="caption" muted>
                {session?.user.email}
              </ThemedText>
            </View>
          </View>
        </Card>

        <View style={styles.form}>
          <TextField label="Full name" value={fullName} onChangeText={setFullName} />
          <TextField
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="Optional"
          />
          <Button title="Save changes" fullWidth loading={saving} onPress={onSave} />
        </View>

        <Divider spacing={Spacing.sm} />
        <Button title="Sign out" variant="ghost" fullWidth onPress={() => signOut()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
