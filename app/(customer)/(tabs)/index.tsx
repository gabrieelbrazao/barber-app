import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  BannerCarousel,
  BarberCard,
  BarberListSkeleton,
  EmptyState,
  ErrorState,
  Screen,
  ScreenHeader,
} from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useBanners, useBarbers, useShopBranding } from '@/lib/queries';
import { useColors } from '@/hooks/use-colors';

export default function ShopHomeScreen() {
  const c = useColors();
  const router = useRouter();
  const { data: barbers, isLoading, isError, refetch, isRefetching } = useBarbers();
  const branding = useShopBranding();
  const { data: banners } = useBanners();

  return (
    <Screen>
      <FlatList
        data={barbers ?? []}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.accent} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.brandRow}>
              {branding.data?.logo_url ? (
                <Image
                  source={{ uri: branding.data.logo_url }}
                  style={[styles.logo, { backgroundColor: c.surfaceAlt }]}
                  contentFit="cover"
                />
              ) : null}
              <View style={styles.brandTitle}>
                <ScreenHeader
                  title={branding.data?.name ?? 'Barbearia'}
                  subtitle="Escolha um profissional e agende"
                />
              </View>
            </View>
            <BannerCarousel banners={banners ?? []} />
            <ThemedText type="subtitle" style={styles.staffTitle}>
              Profissionais
            </ThemedText>
          </View>
        }
        renderItem={({ item }) => (
          <BarberCard
            name={item.name}
            title={item.title}
            avatarUrl={item.avatarUrl}
            onPress={() => router.push(`/barber/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <BarberListSkeleton />
          ) : isError ? (
            <ErrorState message="Não foi possível carregar os profissionais." onRetry={() => refetch()} />
          ) : (
            <EmptyState
              icon="cut-outline"
              title="Nenhum profissional ainda"
              message="Volte em breve."
            />
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
  header: {
    gap: Spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
  },
  brandTitle: {
    flex: 1,
  },
  staffTitle: {
    marginTop: Spacing.sm,
  },
});
