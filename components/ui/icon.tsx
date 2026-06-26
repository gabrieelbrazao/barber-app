import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { OpaqueColorValue, StyleProp, TextStyle } from 'react-native';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export type IconProps = {
  name: IconName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
};

/** Thin wrapper over Ionicons so screens import a single icon component. */
export function Icon({ name, size = 22, color, style }: IconProps) {
  return <Ionicons name={name} size={size} color={color} style={style} />;
}
