import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import {
  BarberCard,
  EmptyState,
  ErrorState,
  Icon,
  Loading,
  Screen,
  ScreenHeader,
  TextField,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useBarbers } from '@/lib/queries';
import { useColors } from '@/hooks/use-colors';

export default function BrowseScreen() {
  const c = useColors();
  const router = useRouter();
  const { data: barbers, isLoading, isError } = useBarbers();
  const [search, setSearch] = useState('');

  const q = search.trim().toLowerCase();
  const filtered = (barbers ?? []).filter((b) =>
    !q
      ? true
      : (b.shopName ?? '').toLowerCase().includes(q) ||
        b.name.toLowerCase().includes(q) ||
        (b.location ?? '').toLowerCase().includes(q)
  );

  return (
    <Screen>
      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <ScreenHeader title="Encontre um barbeiro" subtitle="Agende seu próximo corte" />
            <TextField
              placeholder="Buscar barbearias ou barbeiros"
              value={search}
              onChangeText={setSearch}
              left={<Icon name="search" size={18} color={c.textMuted} />}
              autoCapitalize="none"
            />
          </>
        }
        renderItem={({ item }) => (
          <BarberCard
            name={item.name}
            shopName={item.shopName}
            location={item.location}
            avatarUrl={item.avatarUrl}
            onPress={() => router.push(`/barber/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <Loading />
          ) : isError ? (
            <ErrorState message="Não foi possível carregar os barbeiros." />
          ) : (
            <EmptyState icon="cut-outline" title="Nenhum barbeiro encontrado" message="Tente uma busca diferente." />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
    flexGrow: 1,
  },
});
