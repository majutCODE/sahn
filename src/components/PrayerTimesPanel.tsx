'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import type { Locale } from '@/i18n/routing';
import { formatClockUnit, formatTime } from '@/lib/format';
import {
  ASR_METHODS,
  CALC_METHODS,
  HIGH_LATITUDE_RULES,
  TIME_SLOTS,
  computeDay,
  currentPrayer,
  nextPrayer,
  type AsrMethod,
  type CalcMethod,
  type HighLatitudeRuleName
} from '@/lib/prayer';
import LocationPicker from './LocationPicker';
import { useSettings } from './SettingsProvider';

export default function PrayerTimesPanel() {
  const t = useTranslations('prayer');
  const locale = useLocale() as Locale;
  const { settings, update, ready } = useSettings();
  const [now, setNow] = useState(() => new Date());
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const point = settings?.location ?? null;

  const day = useMemo(
    () => (point && settings ? computeDay(point, now, settings) : null),
    // Recomputing every tick is wasteful; the day only turns over at midnight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [point, settings, now.toDateString()]
  );

  const upcoming = useMemo(
    () => (point && settings ? nextPrayer(point, settings, now) : null),
    [point, settings, now]
  );

  const active = useMemo(
    () => (point && settings ? currentPrayer(point, settings, now) : null),
    [point, settings, now]
  );

  if (!ready || !settings) {
    return <div className="h-64" aria-busy="true" />;
  }

  const zone = settings.location?.timeZone ?? 'UTC';

  return (
    <div>
      {upcoming ? (
        <section aria-live="polite" className="border-s-2 border-glaze ps-5">
          <p className="text-sm text-muted">
            {upcoming.tomorrow ? t('nextTomorrow') : t('next')}
          </p>
          <h2 className="mt-1 font-display text-4xl text-ink sm:text-5xl">
            {t(`names.${upcoming.prayer}`)}
          </h2>
          <p className="mt-2 font-display text-2xl tabular-nums text-glaze">
            <Countdown to={upcoming.time} now={now} locale={locale} />
          </p>
          <p className="mt-1 text-sm text-muted">
            {t('at', { time: formatTime(locale, upcoming.time, zone) })}
          </p>
        </section>
      ) : (
        <section className="border-s-2 border-brass ps-5">
          <h2 className="font-display text-2xl text-ink">{t('needLocation')}</h2>
          <p className="mt-2 max-w-prose text-sm text-muted">
            {t('needLocationNote')}
          </p>
        </section>
      )}

      <div className="mt-6">
        <LocationPicker
          location={settings.location}
          onChange={(location) => update({ location })}
        />
      </div>

      {day && (
        <ol className="mt-8 border-t border-line">
          {TIME_SLOTS.map((slot) => {
            const isActive = slot === active;
            const isNext = slot === upcoming?.prayer && !upcoming.tomorrow;
            return (
              <li
                key={slot}
                aria-current={isActive ? 'time' : undefined}
                className={`flex items-baseline gap-3 border-b border-line px-1 py-3 ${
                  isActive ? 'bg-sunk' : ''
                }`}
              >
                <span className={`flex-1 ${slot === 'sunrise' ? 'text-muted' : 'text-ink'}`}>
                  {t(`names.${slot}`)}
                </span>
                {isNext && (
                  <span className="text-[10px] uppercase tracking-wider text-glaze">
                    {t('nextTag')}
                  </span>
                )}
                <span className="tabular-nums text-ink">
                  {formatTime(locale, day[slot], zone)}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-8">
        <button
          type="button"
          onClick={() => setShowSettings((v) => !v)}
          aria-expanded={showSettings}
          className="text-sm text-glaze underline underline-offset-2"
        >
          {t('settings.toggle')}
        </button>

        {showSettings && (
          <div className="mt-4 grid gap-4 border border-line bg-raised p-4 sm:grid-cols-2">
            <Field label={t('settings.method')} id="calc-method">
              <select
                id="calc-method"
                value={settings.method}
                onChange={(e) => update({ method: e.target.value as CalcMethod })}
                className="w-full border border-line bg-surface px-2 py-2 text-ink"
              >
                {CALC_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {t(`settings.methods.${m}`)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t('settings.asr')} id="asr-method">
              <select
                id="asr-method"
                value={settings.asr}
                onChange={(e) => update({ asr: e.target.value as AsrMethod })}
                className="w-full border border-line bg-surface px-2 py-2 text-ink"
              >
                {ASR_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {t(`settings.asrMethods.${m}`)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t('settings.highLatitude')} id="high-lat">
              <select
                id="high-lat"
                value={settings.highLatitudeRule}
                onChange={(e) =>
                  update({ highLatitudeRule: e.target.value as HighLatitudeRuleName })
                }
                className="w-full border border-line bg-surface px-2 py-2 text-ink"
              >
                {HIGH_LATITUDE_RULES.map((r) => (
                  <option key={r} value={r}>
                    {t(`settings.highLatitudeRules.${r}`)}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted">{t('settings.highLatitudeNote')}</p>
            </Field>
          </div>
        )}
      </div>

      <p className="mt-8 max-w-prose text-xs text-muted">{t('calculatedNote')}</p>
    </div>
  );
}

function Field({
  label,
  id,
  children
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs text-muted">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Countdown({
  to,
  now,
  locale
}: {
  to: Date;
  now: Date;
  locale: Locale;
}) {
  const remaining = Math.max(0, Math.floor((to.getTime() - now.getTime()) / 1000));
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  // Forced LTR: a duration is not bidirectional text, and 02:14:09 must not be
  // reordered when the surrounding paragraph is Arabic.
  return (
    <span dir="ltr" className="inline-block">
      {formatClockUnit(locale, hours)}:{formatClockUnit(locale, minutes)}:
      {formatClockUnit(locale, seconds)}
    </span>
  );
}
