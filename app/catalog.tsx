import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import {
  AppointmentCard,
  Avatar,
  Badge,
  BarberCard,
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  IconButton,
  ScreenHeader,
  ServiceCard,
  SlotButton,
  StatusBadge,
  Stars,
  TextField,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';

/** Dev-only catalog: renders every design-system component for light/dark QA. */
export default function CatalogScreen() {
  const c = useColors();
  const [selectedChip, setSelectedChip] = useState('Degradê');
  const [selectedSlot, setSelectedSlot] = useState('10:30');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="Catálogo" subtitle="Design system Classic Barbershop" />

        <Section title="Tipografia">
          <ThemedText type="display">Display — Playfair</ThemedText>
          <ThemedText type="title">Título — Playfair</ThemedText>
          <ThemedText type="subtitle">Subtítulo</ThemedText>
          <ThemedText type="body">Texto de corpo na fonte sans do sistema.</ThemedText>
          <ThemedText type="label">Rótulo</ThemedText>
          <ThemedText type="caption" muted>
            Legenda (suave)
          </ThemedText>
        </Section>

        <Section title="Botões">
          <View style={styles.rowWrap}>
            <Button title="Primário" onPress={() => {}} />
            <Button title="Secundário" variant="secondary" onPress={() => {}} />
            <Button title="Ghost" variant="ghost" onPress={() => {}} />
          </View>
          <View style={styles.rowWrap}>
            <Button title="Pequeno" size="sm" onPress={() => {}} />
            <Button title="Grande" size="lg" onPress={() => {}} />
            <Button title="Carregando" loading onPress={() => {}} />
            <Button title="Desabilitado" disabled onPress={() => {}} />
          </View>
          <Button title="Largura total" fullWidth onPress={() => {}} />
        </Section>

        <Section title="Campos">
          <TextField label="Nome completo" placeholder="João Silva" />
          <TextField label="E-mail" placeholder="voce@exemplo.com" error="Esse e-mail parece incorreto" />
        </Section>

        <Section title="Avatares e Estrelas">
          <View style={styles.rowWrap}>
            <Avatar name="Marcus Cole" />
            <Avatar name="Tony Russo" size={64} />
            <Avatar uri="https://i.pravatar.cc/120?img=12" size={64} />
          </View>
          <Stars rating={4.5} count={128} />
        </Section>

        <Section title="Badges e Chips">
          <View style={styles.rowWrap}>
            <Badge label="Destaque" />
            <StatusBadge status="pending" />
            <StatusBadge status="confirmed" />
            <StatusBadge status="cancelled" />
            <StatusBadge status="completed" />
          </View>
          <View style={styles.rowWrap}>
            {['Degradê', 'Barba', 'Toalha Quente'].map((l) => (
              <Chip key={l} label={l} selected={selectedChip === l} onPress={() => setSelectedChip(l)} />
            ))}
          </View>
        </Section>

        <Section title="Horários">
          <View style={styles.rowWrap}>
            {['09:00', '09:30', '10:00', '10:30', '11:00'].map((t, i) => (
              <SlotButton
                key={t}
                label={t}
                disabled={i === 2}
                selected={selectedSlot === t}
                onPress={() => setSelectedSlot(t)}
              />
            ))}
          </View>
        </Section>

        <Section title="Card e IconButton">
          <Card>
            <View style={styles.cardHeader}>
              <ThemedText type="subtitle">Título do card</ThemedText>
              <IconButton name="ellipsis-horizontal" accessibilityLabel="Mais" />
            </View>
            <Divider spacing={Spacing.sm} />
            <ThemedText muted>O conteúdo do card fica sobre a cor de superfície.</ThemedText>
          </Card>
        </Section>

        <Section title="Componentes de domínio">
          <BarberCard
            name="Marcos Cole"
            shopName="Navalha de Ouro"
            location="Centro"
            rating={4.8}
            reviewCount={212}
            onPress={() => {}}
          />
          <ServiceCard name="Corte Clássico" priceCents={3500} durationMinutes={45} onBook={() => {}} />
          <ServiceCard name="Barba" priceCents={1500} durationMinutes={20} dimmed actions={null} />
          <AppointmentCard
            serviceName="Corte Clássico"
            partyName="Marcos Cole"
            startTime={new Date().toISOString()}
            status="confirmed"
            actions={<Button title="Cancelar" variant="ghost" size="sm" onPress={() => {}} />}
          />
        </Section>

        <Section title="Estado vazio">
          <EmptyState
            icon="calendar-outline"
            title="Nenhum agendamento ainda"
            message="Agende seu primeiro corte para vê-lo aqui."
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="label" muted style={styles.sectionTitle}>
        {title.toUpperCase()}
      </ThemedText>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    letterSpacing: 1,
  },
  sectionBody: {
    gap: Spacing.md,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
