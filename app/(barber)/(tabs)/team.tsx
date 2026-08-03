import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  ScreenHeader,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { hapticSuccess } from '@/lib/haptics';
import { useSession } from '@/contexts/session';
import { useColors } from '@/hooks/use-colors';
import { useSetStaffApproval, useShopStaff, type StaffMember } from '@/lib/queries';

export default function TeamScreen() {
  const c = useColors();
  const { profile } = useSession();
  const { data, isLoading, isError, refetch } = useShopStaff();
  const setApproval = useSetStaffApproval();

  function onToggle(member: StaffMember) {
    setApproval.mutate(
      { staffId: member.id, approved: !member.approved },
      { onSuccess: hapticSuccess }
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="Equipe" subtitle="Aprove quem pode atender nesta barbearia" />
        {isLoading ? null : isError ? (
          <ErrorState message="Não foi possível carregar a equipe." onRetry={() => refetch()} />
        ) : (data?.length ?? 0) === 0 ? (
          <EmptyState icon="people-outline" title="Nenhum membro ainda" />
        ) : (
          data!.map((member) => {
            const isSelf = member.id === profile?.id;
            return (
              <Card key={member.id}>
                <View style={styles.row}>
                  <Avatar name={member.name} uri={member.avatarUrl} size={48} />
                  <View style={styles.info}>
                    <ThemedText type="label">{member.name}</ThemedText>
                    {member.title ? (
                      <ThemedText type="caption" muted>
                        {member.title}
                      </ThemedText>
                    ) : null}
                  </View>
                  <Badge
                    label={member.approved ? 'Aprovado' : 'Pendente'}
                    color={member.approved ? c.confirmed : c.textMuted}
                  />
                </View>
                <View style={styles.actions}>
                  <Button
                    title={member.approved ? 'Revogar acesso' : 'Aprovar'}
                    size="sm"
                    variant={member.approved ? 'ghost' : 'primary'}
                    loading={setApproval.isPending && setApproval.variables?.staffId === member.id}
                    onPress={() => onToggle(member)}
                  />
                  {isSelf ? (
                    <ThemedText type="caption" muted style={styles.selfHint}>
                      Você
                    </ThemedText>
                  ) : null}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  selfHint: {
    marginLeft: 'auto',
  },
});
