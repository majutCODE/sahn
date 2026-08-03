'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import type { Locale } from '@/i18n/routing';
import { formatNumber } from '@/lib/format';
import { starPath } from '@/lib/girih';
import { qiblaBearing } from '@/lib/prayer';
import { useSettings } from './SettingsProvider';

type CompassState = 'unsupported' | 'needs-permission' | 'live' | 'denied';

type OrientationEventWithHeading = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
};

export default function QiblaPanel() {
  const t = useTranslations('qibla');
  const locale = useLocale() as Locale;
  const { settings, ready } = useSettings();
  const [heading, setHeading] = useState<number | null>(null);
  const [compass, setCompass] = useState<CompassState>('unsupported');

  useEffect(() => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return;
    const needsPermission =
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown })
        .requestPermission === 'function';
    setCompass(needsPermission ? 'needs-permission' : 'live');
    if (!needsPermission) return subscribe(setHeading);
  }, []);

  if (!ready || !settings) return <div className="h-72" aria-busy="true" />;

  const point = settings.location;
  if (!point) {
    return <p className="text-sm text-muted">{t('needLocation')}</p>;
  }

  const bearing = qiblaBearing(point);
  // With a live heading the dial turns so the needle points at the Kaaba from
  // where the device is actually facing. Without one it is a plain bearing
  // diagram read against north.
  const rotation = heading === null ? bearing : bearing - heading;

  async function enable() {
    const api = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    try {
      const result = await api.requestPermission?.();
      if (result === 'granted') {
        setCompass('live');
        subscribe(setHeading);
      } else {
        setCompass('denied');
      }
    } catch {
      setCompass('denied');
    }
  }

  return (
    <div>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
        <svg
          viewBox="0 0 200 200"
          className="w-44 shrink-0 text-muted"
          role="img"
          aria-label={t('dialLabel', {
            degrees: formatNumber(locale, Math.round(bearing))
          })}
        >
          <circle
            cx="100"
            cy="100"
            r="88"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.4"
          />
          {/* Cardinal ticks. North stays at the top of the dial. */}
          {[0, 90, 180, 270].map((deg) => (
            <line
              key={deg}
              x1="100"
              y1="12"
              x2="100"
              y2="26"
              stroke="currentColor"
              strokeWidth="1.5"
              opacity="0.6"
              transform={`rotate(${deg} 100 100)`}
            />
          ))}
          {Array.from({ length: 36 }, (_, i) => i * 10).map((deg) => (
            <line
              key={deg}
              x1="100"
              y1="12"
              x2="100"
              y2="19"
              stroke="currentColor"
              strokeWidth="0.75"
              opacity="0.25"
              transform={`rotate(${deg} 100 100)`}
            />
          ))}
          <text
            x="100"
            y="40"
            textAnchor="middle"
            className="fill-current text-[13px]"
            opacity="0.7"
          >
            {t('north')}
          </text>

          <g transform={`rotate(${rotation} 100 100)`} className="text-glaze">
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="30"
              stroke="currentColor"
              strokeWidth="2.5"
            />
            <path d={starPath(100, 30, 13, 0)} fill="currentColor" />
          </g>
          <circle cx="100" cy="100" r="4" className="fill-current" opacity="0.7" />
        </svg>

        <div className="min-w-0 flex-1 text-center sm:text-start">
          <p className="text-sm text-muted">{t('bearingLabel')}</p>
          <p className="mt-1 font-display text-3xl text-ink">
            {t('degrees', { value: formatNumber(locale, Math.round(bearing)) })}
          </p>

          {compass === 'live' && heading !== null ? (
            <p className="mt-3 text-sm text-muted">{t('liveNote')}</p>
          ) : compass === 'needs-permission' ? (
            <button
              type="button"
              onClick={enable}
              className="mt-3 border border-glaze px-3 py-2 text-sm text-glaze transition-colors hover:bg-glaze hover:text-on-glaze"
            >
              {t('enableCompass')}
            </button>
          ) : (
            <p className="mt-3 max-w-prose text-sm text-muted">{t('manualNote')}</p>
          )}
        </div>
      </div>

      <p className="mt-6 max-w-prose text-xs text-muted">{t('accuracyNote')}</p>
    </div>
  );
}

/** Subscribes to compass events, preferring iOS's true-north heading. */
function subscribe(onHeading: (heading: number) => void) {
  const handle = (event: DeviceOrientationEvent) => {
    const e = event as OrientationEventWithHeading;
    if (typeof e.webkitCompassHeading === 'number') {
      onHeading(e.webkitCompassHeading);
    } else if (e.absolute && typeof e.alpha === 'number') {
      // alpha counts anticlockwise from north; a compass heading counts
      // clockwise, so it has to be inverted before it can be used as one.
      onHeading((360 - e.alpha) % 360);
    }
  };

  window.addEventListener('deviceorientationabsolute', handle);
  window.addEventListener('deviceorientation', handle);
  return () => {
    window.removeEventListener('deviceorientationabsolute', handle);
    window.removeEventListener('deviceorientation', handle);
  };
}
