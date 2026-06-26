import { StyleSheet, Text, type TextProps } from 'react-native';

import { FontFamily } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextType =
  | 'default'
  | 'display'
  | 'title'
  | 'subtitle'
  | 'defaultSemiBold'
  | 'body'
  | 'label'
  | 'caption'
  | 'link';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemedTextType;
  /** Use the muted text color instead of the primary text color. */
  muted?: boolean;
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  muted = false,
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, muted ? 'textMuted' : 'text');

  return <Text style={[{ color }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  // Serif headings (Playfair Display)
  display: {
    fontFamily: FontFamily.serif,
    fontSize: 32,
    lineHeight: 38,
  },
  title: {
    fontFamily: FontFamily.serif,
    fontSize: 24,
    lineHeight: 30,
  },
  // Sans subheadings + body
  subtitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
});
