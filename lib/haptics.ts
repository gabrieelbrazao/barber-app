/** Thin wrappers around expo-haptics for consistent feedback on key actions.
 *  Haptics are best-effort: unsupported platforms (e.g. web) simply no-op. */
import * as Haptics from 'expo-haptics';

export function hapticSuccess() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function hapticError() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
