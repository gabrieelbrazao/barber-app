import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Loading, Screen, StarInput, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session';
import { toUserMessage } from '@/lib/errors';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { useMyReviewForAppointment, useSubmitReview } from '@/lib/queries';

export default function ReviewScreen() {
  const router = useRouter();
  const { profile } = useSession();
  const { appointmentId, barberId, barberName } = useLocalSearchParams<{
    appointmentId: string;
    barberId: string;
    barberName?: string;
  }>();

  const existingQ = useMyReviewForAppointment(appointmentId);
  const submit = useSubmitReview();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  if (existingQ.isLoading) return <Screen><Loading /></Screen>;

  const existing = existingQ.data;

  async function onSubmit() {
    if (!profile || rating < 1) return;
    try {
      await submit.mutateAsync({
        appointmentId,
        barberId,
        customerId: profile.id,
        rating,
        comment: comment.trim() || null,
      });
      hapticSuccess();
      Alert.alert('Obrigado!', 'Sua avaliação foi enviada.');
      router.back();
    } catch (e) {
      hapticError();
      Alert.alert('Não foi possível avaliar', toUserMessage(e));
    }
  }

  return (
    <Screen edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {existing ? (
          <Card>
            <ThemedText type="subtitle">Você já avaliou</ThemedText>
            <ThemedText muted style={styles.spacer}>
              {existing.rating} de 5 estrelas
              {existing.comment ? ` — “${existing.comment}”` : ''}
            </ThemedText>
          </Card>
        ) : (
          <>
            <ThemedText type="title">
              Como foi seu atendimento{barberName ? ` com ${barberName}` : ''}?
            </ThemedText>
            <View style={styles.starsRow}>
              <StarInput value={rating} onChange={setRating} />
            </View>
            <TextField
              label="Comentário (opcional)"
              value={comment}
              onChangeText={setComment}
              placeholder="Conte como foi a experiência"
              multiline
            />
            <Button
              title="Enviar avaliação"
              fullWidth
              disabled={rating < 1}
              loading={submit.isPending}
              onPress={onSubmit}
            />
          </>
        )}
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
  starsRow: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  spacer: {
    marginTop: Spacing.sm,
  },
});
