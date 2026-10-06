import { computeDay, PRAYERS, type Prayer } from '@/lib/prayer';
import type { Settings } from '@/lib/settings';

/**
 * Prayer notifications, scheduled on the device.
 *
 * No push server and no backend. The times are already computed locally from
 * adhan and a stored location, so the device can be told about them days in
 * advance and will fire them with the screen off and the network down. That is
 * also the capability that makes a native build worth submitting at all: a
 * webview wrapper with nothing the browser could not do is the shape App
 * Review rejects.
 *
 * iOS caps pending local notifications at 64 and silently drops the rest, so
 * twelve days of five prayers (60) is the most that can be scheduled safely.
 * The window is topped up every time the app comes to the foreground, so in
 * practice it never runs out.
 */

const DAYS_AHEAD = 12;

export type PrayerLabels = Record<Prayer, string>;

/** Stable per day and prayer, so a reschedule replaces rather than duplicates. */
function notificationId(dayOffset: number, prayerIndex: number): number {
  return 1000 + dayOffset * 10 + prayerIndex;
}

export function isNative(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

/**
 * Replaces the scheduled set with a fresh twelve days.
 *
 * Returns the number scheduled, or null when it did not run: not native, no
 * location set, or permission refused. The caller treats all three the same
 * way, which is to say it does nothing about them.
 */
export async function syncPrayerNotifications(
  settings: Settings,
  labels: PrayerLabels,
  body: string
): Promise<number | null> {
  if (!isNative() || !settings.location) return null;

  // Imported dynamically so the plugin never enters the web bundle, where it
  // would be dead weight on every page load for the sake of a native path.
  const { LocalNotifications } = await import('@capacitor/local-notifications');

  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== 'granted') {
    const asked = await LocalNotifications.requestPermissions();
    if (asked.display !== 'granted') return null;
  }

  // Clear the previous window first. Without this, a settings change leaves
  // the old times pending alongside the new ones and the device fires both.
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) {
    await LocalNotifications.cancel({ notifications: pending.notifications });
  }

  const now = new Date();
  const scheduled: Array<{
    id: number;
    title: string;
    body: string;
    schedule: { at: Date; allowWhileIdle: boolean };
  }> = [];

  for (let day = 0; day < DAYS_AHEAD; day += 1) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);
    const times = computeDay(settings.location, date, settings);

    PRAYERS.forEach((prayer, index) => {
      const at = times[prayer];
      // A polar day can leave a prayer without a determinable time, and the
      // past cannot be scheduled.
      if (Number.isNaN(at.getTime()) || at.getTime() <= now.getTime()) return;

      scheduled.push({
        id: notificationId(day, index),
        title: labels[prayer],
        body,
        schedule: {
          at,
          // Fire even in Android's doze mode. A prayer reminder that waits for
          // the device to wake up is not a prayer reminder.
          allowWhileIdle: true
        }
      });
    });
  }

  if (!scheduled.length) return 0;

  await LocalNotifications.schedule({ notifications: scheduled });
  return scheduled.length;
}

/** Used when the user turns reminders off. */
export async function cancelPrayerNotifications(): Promise<void> {
  if (!isNative()) return;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) {
    await LocalNotifications.cancel({ notifications: pending.notifications });
  }
}
