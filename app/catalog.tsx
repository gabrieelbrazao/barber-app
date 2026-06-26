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
  const [selectedChip, setSelectedChip] = useState('Fade');
  const [selectedSlot, setSelectedSlot] = useState('10:30');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="Catalog" subtitle="Classic Barbershop design system" />

        <Section title="Typography">
          <ThemedText type="display">Display — Playfair</ThemedText>
          <ThemedText type="title">Title — Playfair</ThemedText>
          <ThemedText type="subtitle">Subtitle</ThemedText>
          <ThemedText type="body">Body text in the system sans.</ThemedText>
          <ThemedText type="label">Label</ThemedText>
          <ThemedText type="caption" muted>
            Caption (muted)
          </ThemedText>
        </Section>

        <Section title="Buttons">
          <View style={styles.rowWrap}>
            <Button title="Primary" onPress={() => {}} />
            <Button title="Secondary" variant="secondary" onPress={() => {}} />
            <Button title="Ghost" variant="ghost" onPress={() => {}} />
          </View>
          <View style={styles.rowWrap}>
            <Button title="Small" size="sm" onPress={() => {}} />
            <Button title="Large" size="lg" onPress={() => {}} />
            <Button title="Loading" loading onPress={() => {}} />
            <Button title="Disabled" disabled onPress={() => {}} />
          </View>
          <Button title="Full width" fullWidth onPress={() => {}} />
        </Section>

        <Section title="Inputs">
          <TextField label="Full name" placeholder="Jane Doe" />
          <TextField label="Email" placeholder="you@example.com" error="That email looks off" />
        </Section>

        <Section title="Avatars & Stars">
          <View style={styles.rowWrap}>
            <Avatar name="Marcus Cole" />
            <Avatar name="Tony Russo" size={64} />
            <Avatar uri="https://i.pravatar.cc/120?img=12" size={64} />
          </View>
          <Stars rating={4.5} count={128} />
        </Section>

        <Section title="Badges & Chips">
          <View style={styles.rowWrap}>
            <Badge label="Featured" />
            <StatusBadge status="pending" />
            <StatusBadge status="confirmed" />
            <StatusBadge status="cancelled" />
            <StatusBadge status="completed" />
          </View>
          <View style={styles.rowWrap}>
            {['Fade', 'Beard', 'Hot Towel'].map((l) => (
              <Chip key={l} label={l} selected={selectedChip === l} onPress={() => setSelectedChip(l)} />
            ))}
          </View>
        </Section>

        <Section title="Time slots">
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

        <Section title="Card & IconButton">
          <Card>
            <View style={styles.cardHeader}>
              <ThemedText type="subtitle">Card title</ThemedText>
              <IconButton name="ellipsis-horizontal" accessibilityLabel="More" />
            </View>
            <Divider spacing={Spacing.sm} />
            <ThemedText muted>Card body content sits on the surface color.</ThemedText>
          </Card>
        </Section>

        <Section title="Domain components">
          <BarberCard
            name="Marcus Cole"
            shopName="The Sharp Edge"
            location="Downtown"
            rating={4.8}
            reviewCount={212}
            onPress={() => {}}
          />
          <ServiceCard name="Classic Cut" priceCents={3500} durationMinutes={45} onBook={() => {}} />
          <ServiceCard name="Beard Trim" priceCents={1500} durationMinutes={20} dimmed actions={null} />
          <AppointmentCard
            serviceName="Classic Cut"
            partyName="Marcus Cole"
            startTime={new Date().toISOString()}
            status="confirmed"
            actions={<Button title="Cancel" variant="ghost" size="sm" onPress={() => {}} />}
          />
        </Section>

        <Section title="Empty state">
          <EmptyState
            icon="calendar-outline"
            title="No appointments yet"
            message="Book your first cut to see it here."
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
