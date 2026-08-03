import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card, Chip, ErrorState, Loading, Screen, ScreenHeader } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { lastNDays, noShowRate } from '@/lib/analytics';
import { formatPrice } from '@/lib/format';
import { useShopAnalytics } from '@/lib/queries';

const RANGES = [
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
];

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.kpi}>
      <ThemedText type="title">{value}</ThemedText>
      <ThemedText type="caption" muted>
        {label}
      </ThemedText>
    </Card>
  );
}

export default function DashboardScreen() {
  const [days, setDays] = useState(30);
  const range = useMemo(() => lastNDays(days), [days]);
  const { data, isLoading, isError } = useShopAnalytics(range);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="Painel" subtitle="Desempenho da barbearia" />

        <View style={styles.ranges}>
          {RANGES.map((r) => (
            <Chip key={r.days} label={r.label} selected={days === r.days} onPress={() => setDays(r.days)} />
          ))}
        </View>

        {isLoading ? (
          <Loading />
        ) : isError || !data ? (
          <ErrorState message="Não foi possível carregar o painel." />
        ) : (
          <>
            <View style={styles.kpiRow}>
              <Kpi label="Receita" value={formatPrice(data.revenue_cents)} />
              <Kpi label="Concluídos" value={String(data.completed)} />
            </View>
            <View style={styles.kpiRow}>
              <Kpi label="Agendamentos" value={String(data.total)} />
              <Kpi label="Faltas" value={`${noShowRate(data)}%`} />
            </View>

            <Card>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Serviços mais concluídos
              </ThemedText>
              {data.top_services.length === 0 ? (
                <ThemedText muted>Sem dados no período.</ThemedText>
              ) : (
                data.top_services.map((s) => (
                  <View key={s.name} style={styles.serviceRow}>
                    <ThemedText>{s.name}</ThemedText>
                    <ThemedText type="label" muted>
                      {s.count}
                    </ThemedText>
                  </View>
                ))
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  ranges: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  kpi: {
    flex: 1,
    gap: Spacing.xs,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
});
