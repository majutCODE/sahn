'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import type { Locale } from '@/i18n/routing';
import { findCity, searchCities, type City } from '@/lib/cities';
import { deviceTimeZone, type StoredLocation } from '@/lib/settings';

type Props = {
  location: StoredLocation | null;
  onChange: (location: StoredLocation) => void;
};

type GeoState = 'idle' | 'locating' | 'denied' | 'unavailable';

export default function LocationPicker({ location, onChange }: Props) {
  const t = useTranslations('prayer.location');
  const locale = useLocale() as Locale;
  const [query, setQuery] = useState('');
  const [geo, setGeo] = useState<GeoState>('idle');
  const [open, setOpen] = useState(false);

  const results = searchCities(query);

  function useDevice() {
    if (!('geolocation' in navigator)) {
      setGeo('unavailable');
      return;
    }
    setGeo('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo('idle');
        setOpen(false);
        onChange({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          timeZone: deviceTimeZone(),
          source: 'device'
        });
      },
      // Denied and unavailable are different messages: one the user can undo in
      // their browser, the other means fall back to picking a city.
      (err) => setGeo(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { timeout: 10_000, maximumAge: 5 * 60_000 }
    );
  }

  function pick(city: City) {
    setOpen(false);
    setQuery('');
    onChange({
      latitude: city.latitude,
      longitude: city.longitude,
      cityId: city.id,
      timeZone: city.timeZone,
      source: 'manual'
    });
  }

  const city = findCity(location?.cityId);
  const shown = city
    ? locale === 'ar'
      ? city.ar
      : city.en
    : location
      ? t('coordinates', {
          lat: location.latitude.toFixed(2),
          lon: location.longitude.toFixed(2)
        })
      : null;

  return (
    <div className="text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted">{t('label')}</span>
        <span className="text-ink">{shown ?? t('none')}</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="text-glaze underline underline-offset-2"
        >
          {location ? t('change') : t('set')}
        </button>
      </div>

      {open && (
        <div className="mt-3 border border-line bg-raised p-3">
          <button
            type="button"
            onClick={useDevice}
            disabled={geo === 'locating'}
            className="w-full border border-glaze px-3 py-2 text-glaze transition-colors hover:bg-glaze hover:text-on-glaze disabled:opacity-50"
          >
            {geo === 'locating' ? t('locating') : t('useDevice')}
          </button>

          {geo === 'denied' && (
            <p role="alert" className="mt-2 text-xs text-clay">
              {t('denied')}
            </p>
          )}
          {geo === 'unavailable' && (
            <p role="alert" className="mt-2 text-xs text-clay">
              {t('unavailable')}
            </p>
          )}

          <label htmlFor="city" className="mt-4 block text-xs text-muted">
            {t('searchLabel')}
          </label>
          <input
            id="city"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="mt-1 w-full border border-line bg-surface px-3 py-2 text-ink text-start"
          />

          {query.trim() !== '' && (
            <ul className="mt-2 max-h-56 overflow-y-auto">
              {results.length === 0 ? (
                <li className="px-1 py-2 text-xs text-muted">{t('noMatches')}</li>
              ) : (
                results.map((city) => (
                  <li key={city.id}>
                    <button
                      type="button"
                      onClick={() => pick(city)}
                      className="w-full px-1 py-2 text-start text-ink hover:bg-sunk"
                    >
                      {locale === 'ar' ? city.ar : city.en}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
