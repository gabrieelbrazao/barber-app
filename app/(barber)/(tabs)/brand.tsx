import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ColorPicker, { HueSlider, Panel1, Preview } from 'reanimated-color-picker';

import { ThemedText } from '@/components/themed-text';
import {
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  Loading,
  Screen,
  ScreenHeader,
  TextField,
} from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { HEX_COLOR, OVERRIDABLE_TOKENS, mergeBranding, type Scheme } from '@/lib/branding';
import { SHOP_ID } from '@/lib/config';
import type { Banner, BrandColors, PromoCode } from '@/lib/database.types';
import { toUserMessage } from '@/lib/errors';
import { formatPrice } from '@/lib/format';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import {
  useBanners,
  useDeleteBanner,
  useDeletePromo,
  usePromoCodes,
  useSaveBanner,
  useSavePromo,
  useShop,
  useUpdateShop,
} from '@/lib/queries';
import { bannerObjectPath, logoObjectPath } from '@/lib/shop';
import { pickImage, uploadImage } from '@/lib/uploads';
import { useThemeMode } from '@/contexts/theme-mode';
import { useColors } from '@/hooks/use-colors';

const TOKEN_LABELS: Record<(typeof OVERRIDABLE_TOKENS)[number], string> = {
  accent: 'Destaque',
  background: 'Fundo',
  surface: 'Superfície',
  text: 'Texto',
  tint: 'Realce',
};

const PRESET_ACCENTS = ['#B8860B', '#1E88E5', '#43A047', '#E53935', '#8E24AA', '#00897B', '#FB8C00'];

/** Keep only hex digits, force `#` prefix + uppercase, cap at 6 digits. */
function normalizeHex(input: string): string {
  return '#' + input.replace(/[^0-9a-fA-F]/g, '').slice(0, 6).toUpperCase();
}

/** Hex color input with a tappable preview swatch that opens the visual picker. */
function ColorField({
  label,
  value,
  onChange,
  onOpenPicker,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onOpenPicker: () => void;
}) {
  const c = useColors();
  const swatch = HEX_COLOR.test(value) ? value : c.surfaceAlt;
  return (
    <TextField
      label={label}
      value={value}
      onChangeText={(v) => onChange(normalizeHex(v))}
      autoCapitalize="characters"
      autoCorrect={false}
      placeholder="#RRGGBB"
      maxLength={7}
      left={
        <Pressable onPress={onOpenPicker} accessibilityLabel={`Escolher cor: ${label}`}>
          <View style={[styles.colorSwatch, { backgroundColor: swatch, borderColor: c.border }]} />
        </Pressable>
      }
    />
  );
}

/** Bottom-sheet visual color picker (hue + saturation/value panel). */
function ColorPickerSheet({
  label,
  initial,
  onPick,
  onClose,
}: {
  label: string;
  initial: string;
  onPick: (hex: string) => void;
  onClose: () => void;
}) {
  const c = useColors();
  const picked = useRef(initial);
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      {/* A Modal renders outside the root GestureHandlerRootView, so the picker's
          gesture-driven panel/slider need their own root here (else they crash). */}
      <GestureHandlerRootView style={styles.flex}>
        <Pressable style={styles.pickerBackdrop} onPress={onClose}>
          <Pressable style={[styles.pickerSheet, { backgroundColor: c.surface }]}>
            <ThemedText type="subtitle">{label}</ThemedText>
            <ColorPicker
              style={styles.picker}
              value={initial}
              // onCompleteJS runs on the JS thread (runOnJS); the plain `onComplete`
              // is a UI-thread worklet and crashes when it calls back into JS.
              onCompleteJS={({ hex }) => {
                picked.current = hex;
              }}>
              <Preview hideInitialColor />
              <Panel1 style={styles.pickerPanel} />
              <HueSlider />
            </ColorPicker>
            <Button
              title="Concluir"
              fullWidth
              onPress={() => {
                onPick(normalizeHex(picked.current));
                onClose();
              }}
            />
          </Pressable>
        </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
}

export default function BrandScreen() {
  const c = useColors();
  const shopQ = useShop();
  const bannersQ = useBanners(true);
  const updateShop = useUpdateShop();

  const [name, setName] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [colors, setColorsState] = useState<BrandColors | null>(null);
  // Start on the scheme the app is actually showing (the user's theme choice), so
  // what you edit matches what you see.
  const activeScheme = useThemeMode().scheme;
  const [scheme, setScheme] = useState<Scheme>(activeScheme);
  const [savingLogo, setSavingLogo] = useState(false);
  const [pickerToken, setPickerToken] = useState<(typeof OVERRIDABLE_TOKENS)[number] | null>(null);

  // Seed editable state once the shop loads.
  if (shopQ.data && name === null) {
    setName(shopQ.data.name ?? '');
    setLocation(shopQ.data.location ?? '');
    setColorsState(shopQ.data.colors ?? {});
  }

  if (shopQ.isLoading) return <Screen><Loading /></Screen>;
  if (shopQ.isError || !shopQ.data)
    return <Screen><ErrorState message="Não foi possível carregar a barbearia." onRetry={() => shopQ.refetch()} /></Screen>;

  const shop = shopQ.data;
  const cols = colors ?? {};
  const dirty =
    (name ?? '') !== (shop.name ?? '') ||
    (location ?? '') !== (shop.location ?? '') ||
    JSON.stringify(cols) !== JSON.stringify(shop.colors ?? {});

  function setToken(token: string, value: string) {
    setColorsState((prev) => {
      const next: BrandColors = { ...(prev ?? {}) };
      next[scheme] = { ...(next[scheme] ?? {}), [token]: value };
      return next;
    });
  }

  async function onSaveIdentity() {
    try {
      await updateShop.mutateAsync({
        name: name?.trim() || null,
        location: location?.trim() || null,
        colors: cols,
      });
      hapticSuccess();
      Alert.alert('Salvo', 'A identidade da barbearia foi atualizada.');
    } catch (e) {
      hapticError();
      Alert.alert('Não foi possível salvar', toUserMessage(e));
    }
  }

  async function onChangeLogo() {
    const image = await pickImage();
    if (!image) return;
    setSavingLogo(true);
    try {
      const url = await uploadImage({ bucket: 'branding', path: logoObjectPath(SHOP_ID), image });
      await updateShop.mutateAsync({ logoUrl: url });
      hapticSuccess();
    } catch (e) {
      hapticError();
      Alert.alert('Não foi possível enviar o logo', toUserMessage(e));
    } finally {
      setSavingLogo(false);
    }
  }

  const preview = mergeBranding(cols, scheme);

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader title="Marca" subtitle="Personalize a aparência do app" />

          {/* Identity */}
          <View style={styles.section}>
            <TextField label="Nome da barbearia" value={name ?? ''} onChangeText={setName} />
            <TextField
              label="Localização"
              value={location ?? ''}
              onChangeText={setLocation}
              placeholder="Bairro / cidade"
            />
          </View>

          {/* Logo */}
          <Card>
            <ThemedText type="subtitle" style={styles.cardTitle}>
              Logo
            </ThemedText>
            <View style={styles.logoRow}>
              {shop.logo_url ? (
                <Image
                  source={{ uri: shop.logo_url }}
                  style={[styles.logo, { backgroundColor: c.surfaceAlt }]}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.logo, styles.logoEmpty, { backgroundColor: c.surfaceAlt }]}>
                  <Icon name="image-outline" size={24} color={c.textMuted} />
                </View>
              )}
              <Button
                title={shop.logo_url ? 'Trocar logo' : 'Enviar logo'}
                variant="secondary"
                size="sm"
                loading={savingLogo}
                onPress={onChangeLogo}
              />
            </View>
          </Card>

          {/* Colors */}
          <Card>
            <View style={styles.colorBody}>
              <ThemedText type="subtitle">Cores</ThemedText>
              <View style={styles.schemeRow}>
                <Chip label="Claro" selected={scheme === 'light'} onPress={() => setScheme('light')} />
                <Chip label="Escuro" selected={scheme === 'dark'} onPress={() => setScheme('dark')} />
              </View>

              {/* Live preview */}
              <View style={[styles.preview, { backgroundColor: preview.background, borderColor: preview.border }]}>
                <View style={[styles.previewCard, { backgroundColor: preview.surface }]}>
                  <ThemedText style={{ color: preview.text }} type="label">
                    {name || 'Sua barbearia'}
                  </ThemedText>
                  <View style={[styles.previewBtn, { backgroundColor: preview.accent }]}>
                    <ThemedText style={{ color: preview.onAccent }} type="label">
                      Agendar
                    </ThemedText>
                  </View>
                </View>
              </View>

              <View style={styles.swatchGroup}>
                <ThemedText type="label" muted>
                  Atalhos de destaque
                </ThemedText>
                <View style={styles.swatches}>
                  {PRESET_ACCENTS.map((hex) => {
                    const selected = (cols[scheme]?.accent ?? Colors[scheme].accent).toUpperCase() === hex;
                    return (
                      <Pressable
                        key={hex}
                        onPress={() => setToken('accent', hex)}
                        style={[
                          styles.swatch,
                          { backgroundColor: hex, borderColor: selected ? c.text : c.border },
                          selected && styles.swatchSelected,
                        ]}
                        accessibilityLabel={`Definir destaque ${hex}`}
                      />
                    );
                  })}
                </View>
              </View>

              <View style={styles.colorList}>
                {OVERRIDABLE_TOKENS.map((token) => (
                  <ColorField
                    key={token}
                    label={TOKEN_LABELS[token]}
                    value={cols[scheme]?.[token] ?? Colors[scheme][token]}
                    onChange={(v) => setToken(token, v)}
                    onOpenPicker={() => setPickerToken(token)}
                  />
                ))}
              </View>

              <Button
                title="Restaurar cores padrão"
                variant="ghost"
                size="sm"
                onPress={() => setColorsState((prev) => ({ ...(prev ?? {}), [scheme]: {} }))}
              />
            </View>
          </Card>

          <Button
            title={dirty ? 'Salvar marca' : 'Tudo salvo'}
            fullWidth
            loading={updateShop.isPending}
            disabled={!dirty}
            onPress={onSaveIdentity}
          />

          <Divider spacing={Spacing.sm} />

          {/* Banners */}
          <BannersManager banners={bannersQ.data ?? []} loading={bannersQ.isLoading} />

          <Divider spacing={Spacing.sm} />

          {/* Promo codes */}
          <PromoManager />
        </ScrollView>
      </KeyboardAvoidingView>

      {pickerToken ? (
        <ColorPickerSheet
          label={TOKEN_LABELS[pickerToken]}
          initial={cols[scheme]?.[pickerToken] ?? Colors[scheme][pickerToken]}
          onPick={(hex) => setToken(pickerToken, hex)}
          onClose={() => setPickerToken(null)}
        />
      ) : null}
    </Screen>
  );
}

function BannersManager({ banners, loading }: { banners: Banner[]; loading: boolean }) {
  const c = useColors();
  const saveBanner = useSaveBanner();
  const deleteBanner = useDeleteBanner();
  const [adding, setAdding] = useState(false);

  async function onAdd() {
    const image = await pickImage();
    if (!image) return;
    setAdding(true);
    try {
      const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const url = await uploadImage({ bucket: 'banners', path: bannerObjectPath(SHOP_ID, key), image });
      await saveBanner.mutateAsync({ imageUrl: url, sortOrder: banners.length });
      hapticSuccess();
    } catch (e) {
      hapticError();
      Alert.alert('Não foi possível adicionar o banner', toUserMessage(e));
    } finally {
      setAdding(false);
    }
  }

  function onToggle(b: Banner) {
    saveBanner.mutate({
      id: b.id,
      imageUrl: b.image_url,
      title: b.title,
      sortOrder: b.sort_order,
      active: !b.active,
    });
  }

  function onDelete(b: Banner) {
    Alert.alert('Excluir banner?', 'Ele deixará de aparecer no app.', [
      { text: 'Manter', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteBanner.mutate(b.id) },
    ]);
  }

  return (
    <View style={styles.section}>
      <View style={styles.bannersHeader}>
        <ThemedText type="subtitle">Banners</ThemedText>
        <IconButton
          name="add-circle"
          size={28}
          color={c.accent}
          accessibilityLabel="Adicionar banner"
          onPress={onAdd}
        />
      </View>

      {adding ? <Loading /> : null}

      {banners.length === 0 && !loading ? (
        <EmptyState icon="images-outline" title="Nenhum banner" message="Adicione promoções para a tela inicial." />
      ) : (
        banners.map((b) => (
          <Card key={b.id}>
            <Image source={{ uri: b.image_url }} style={styles.bannerImg} contentFit="cover" />
            <View style={styles.bannerRow}>
              <View style={styles.bannerToggle}>
                <Switch
                  value={b.active}
                  onValueChange={() => onToggle(b)}
                  trackColor={{ true: c.accent, false: c.border }}
                  thumbColor={b.active ? c.surface : c.textMuted}
                />
                <ThemedText type="caption" muted>
                  {b.active ? 'Ativo' : 'Oculto'}
                </ThemedText>
              </View>
              <IconButton
                name="trash-outline"
                color={c.cancelled}
                accessibilityLabel="Excluir banner"
                onPress={() => onDelete(b)}
              />
            </View>
          </Card>
        ))
      )}
    </View>
  );
}

function PromoManager() {
  const c = useColors();
  const promosQ = usePromoCodes();
  const save = useSavePromo();
  const del = useDeletePromo();
  const [code, setCode] = useState('');
  const [kind, setKind] = useState<'percent' | 'amount'>('percent');
  const [value, setValue] = useState('');

  async function onAdd() {
    const v = parseInt(value, 10);
    if (!code.trim() || !v || v <= 0) {
      Alert.alert('Dados incompletos', 'Informe um código e um valor maior que zero.');
      return;
    }
    try {
      await save.mutateAsync({ code, kind, value: v });
      setCode('');
      setValue('');
      hapticSuccess();
    } catch (e) {
      hapticError();
      Alert.alert('Não foi possível salvar', toUserMessage(e));
    }
  }

  const describe = (p: PromoCode) =>
    p.kind === 'percent' ? `${p.value}% de desconto` : `${formatPrice(p.value * 100)} de desconto`;

  return (
    <View style={styles.section}>
      <ThemedText type="subtitle">Cupons</ThemedText>

      <View style={styles.promoForm}>
        <TextField
          label="Código"
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="BEMVINDO"
        />
        <View style={styles.schemeRow}>
          <Chip label="Percentual" selected={kind === 'percent'} onPress={() => setKind('percent')} />
          <Chip label="Valor fixo" selected={kind === 'amount'} onPress={() => setKind('amount')} />
        </View>
        <TextField
          label={kind === 'percent' ? 'Percentual (%)' : 'Valor (R$)'}
          value={value}
          onChangeText={setValue}
          keyboardType="number-pad"
        />
        <Button
          title="Adicionar cupom"
          variant="secondary"
          size="sm"
          loading={save.isPending}
          onPress={onAdd}
        />
      </View>

      {(promosQ.data?.length ?? 0) === 0 ? (
        <EmptyState icon="pricetag-outline" title="Nenhum cupom" message="Crie cupons para suas promoções." />
      ) : (
        promosQ.data!.map((p) => (
          <Card key={p.id}>
            <View style={styles.bannerRow}>
              <View style={styles.flex}>
                <ThemedText type="label">{p.code}</ThemedText>
                <ThemedText type="caption" muted>
                  {describe(p)}
                  {p.active ? '' : ' · inativo'}
                </ThemedText>
              </View>
              <View style={styles.bannerToggle}>
                <Switch
                  value={p.active}
                  onValueChange={(active) =>
                    save.mutate({ id: p.id, code: p.code, kind: p.kind, value: p.value, active })
                  }
                  trackColor={{ true: c.accent, false: c.border }}
                  thumbColor={p.active ? c.surface : c.textMuted}
                />
                <IconButton
                  name="trash-outline"
                  color={c.cancelled}
                  accessibilityLabel="Excluir cupom"
                  onPress={() => del.mutate(p.id)}
                />
              </View>
            </View>
          </Card>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  promoForm: {
    gap: Spacing.md,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.md,
  },
  cardTitle: {
    marginBottom: Spacing.md,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
  },
  logoEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorBody: {
    gap: Spacing.lg,
  },
  schemeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  preview: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
  },
  previewCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  previewBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  swatchGroup: {
    gap: Spacing.sm,
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  swatchSelected: {
    borderWidth: 3,
  },
  colorList: {
    gap: Spacing.md,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pickerBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerSheet: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    gap: Spacing.lg,
  },
  picker: {
    gap: Spacing.lg,
  },
  pickerPanel: {
    height: 200,
    borderRadius: Radius.md,
  },
  bannersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerImg: {
    width: '100%',
    height: 120,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
