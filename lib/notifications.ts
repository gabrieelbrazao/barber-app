/**
 * Local appointment reminders (no server / push tokens needed). Scheduled on the
 * customer's device when they book or reschedule, fired `LEAD_MINUTES` before the
 * start, and cancelled when the booking is cancelled or moved. The appointment→
 * notification id map lives in AsyncStorage so we can cancel/replace later.
 *
 * NOTE: local notifications only fire on a real device with the app installed;
 * they can't be verified in a simulator-less CI. The pure `reminderDate` helper is
 * unit-tested; the scheduling calls are device-verified.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import { reminderDate } from '@/lib/reminder-time';

export { reminderDate } from '@/lib/reminder-time';

const MAP_KEY = 'appt_reminders'; // { [appointmentId]: notificationId }

async function readMap(): Promise<Record<string, string>> {
  try {
    return JSON.parse((await AsyncStorage.getItem(MAP_KEY)) ?? '{}');
  } catch {
    return {};
  }
}

async function writeMap(map: Record<string, string>): Promise<void> {
  await AsyncStorage.setItem(MAP_KEY, JSON.stringify(map));
}

/** Banner + list, no sound — call once at app start. */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return req.granted;
}

/** Cancel a previously-scheduled reminder for an appointment, if any. */
export async function cancelReminder(appointmentId: string): Promise<void> {
  const map = await readMap();
  const id = map[appointmentId];
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // already fired / unknown id — fine.
  }
  delete map[appointmentId];
  await writeMap(map);
}

/** Schedule (or replace) the reminder for an appointment. No-op if it'd fire in the past. */
export async function scheduleReminder(input: {
  appointmentId: string;
  startISO: string;
  title: string;
  body: string;
}): Promise<void> {
  const when = reminderDate(input.startISO);
  if (when.getTime() <= Date.now()) return;
  if (!(await ensureNotificationPermission())) return;

  await cancelReminder(input.appointmentId);
  const id = await Notifications.scheduleNotificationAsync({
    content: { title: input.title, body: input.body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
  });
  const map = await readMap();
  map[input.appointmentId] = id;
  await writeMap(map);
}
