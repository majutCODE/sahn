'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect } from 'react';
import { PRAYERS } from '@/lib/prayer';
import {
  isNative,
  syncPrayerNotifications,
  type PrayerLabels
} from '@/lib/native/notifications';
import { useSettings } from './SettingsProvider';

/**
 * Keeps the device's scheduled prayer notifications in step with settings.
 *
 * Mounted once in the layout and renders nothing. On the web every path here
 * exits immediately and the plugin is never imported, so the native build
 * costs the site nothing.
 *
 * Rescheduling on resume is what makes a twelve-day window behave like an
 * indefinite one: the app is opened most days, and each open pushes the
 * horizon out again.
 */
export default function NativeBridge() {
  const { settings, ready } = useSettings();
  const t = useTranslations('notifications');

  const sync = useCallback(() => {
    if (!ready || !settings) return;
    const labels = Object.fromEntries(
      PRAYERS.map((prayer) => [prayer, t(`titles.${prayer}`)])
    ) as PrayerLabels;
    void syncPrayerNotifications(settings, labels, t('body'));
  }, [ready, settings, t]);

  useEffect(() => {
    if (!isNative()) return;
    sync();
  }, [sync]);

  useEffect(() => {
    if (!isNative()) return;
    let remove: (() => void) | undefined;

    void (async () => {
      const { App } = await import('@capacitor/app');
      const handle = await App.addListener('resume', sync);
      remove = () => void handle.remove();
    })();

    return () => remove?.();
  }, [sync]);

  return null;
}
