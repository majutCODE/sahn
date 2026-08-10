'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import type { Locale } from '@/i18n/routing';
import { formatClockUnit } from '@/lib/format';
import { nextPrayer, type CalcMethod, type GeoPoint } from '@/lib/prayer';

/**
 * A live countdown to the next prayer.
 *
 * The only thing on the page that needs JavaScript, and it adds to a page that
 * is already complete without it: the times, the month, the Qibla bearing and
 * the explanation are all in the server HTML. If this never hydrates, a reader
 * loses a ticking clock and nothing else.
 *
 * Renders nothing until mounted. The server has no idea what time it is where
 * the reader is, and a countdown that arrives with one value and immediately
 * corrects itself looks broken.
 */
export default function NextPrayerCountdown({
  city,
  timeZone,
  method
}: {
  city: GeoPoint;
  timeZone: string;
  method: CalcMethod;
}) {
  const t = useTranslations('prayerPages');
  const locale = useLocale() as Locale;
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!now) return null;

  const upcoming = nextPrayer(
    city,
    { method, asr: 'standard', highLatitudeRule: 'auto' },
    now
  );

  const remaining = Math.max(0, upcoming.time.getTime() - now.getTime());
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);

  return (
    <p className="mt-4 border-s-2 border-glaze ps-4 text-sm text-ink">
      {t('countdown', {
        prayer: t(`slots.${upcoming.prayer}`),
        time: `${formatClockUnit(locale, hours)}:${formatClockUnit(
          locale,
          minutes
        )}:${formatClockUnit(locale, seconds)}`
      })}
      <span className="sr-only">{timeZone}</span>
    </p>
  );
}
