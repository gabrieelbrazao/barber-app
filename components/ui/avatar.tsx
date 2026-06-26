import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useColors } from '@/hooks/use-colors';

export type AvatarProps = {
  name?: string | null;
  uri?: string | null;
  size?: number;
};

function initials(name?: string | null) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || '?';
}

export function Avatar({ name, uri, size = 48 }: AvatarProps) {
  const c = useColors();
  const radius = size / 2;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radius, backgroundColor: c.surfaceAlt }}
        contentFit="cover"
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: radius, backgroundColor: c.surfaceAlt },
      ]}>
      <ThemedText
        type="label"
        style={{
          fontSize: size * 0.36,
          // Match line height to the (overridden) font size so tall glyphs aren't
          // clipped by the smaller default line box, and disable Android font padding.
          lineHeight: size * 0.42,
          includeFontPadding: false,
          textAlignVertical: 'center',
          color: c.accent,
        }}>
        {initials(name)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
