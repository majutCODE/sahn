'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { localeFormatTag, type Locale } from '@/i18n/routing';
import { formatNumber } from '@/lib/format';
import { PRAYERS, type Prayer } from '@/lib/prayer';
import {
  PRAYER_STATUSES,
  currentStreak,
  dayKey,
  isDayComplete,
  outstanding,
  recentDays,
  toDayMap,
  totalOutstanding,
  type PrayerLog,
  type PrayerStatus,
  type QadaEntry
} from '@/lib/tracker';
import { createClient } from '@/lib/supabase/client';

type Load = 'loading' | 'signed-out' | 'ready' | 'error';

export default function SalahTracker() {
  const t = useTranslations('tracker');
  const locale = useLocale() as Locale;

  const [state, setState] = useState<Load>('loading');
  const [logs, setLogs] = useState<PrayerLog[]>([]);
  const [qada, setQada] = useState<QadaEntry[]>([]);
  const today = useMemo(() => new Date(), []);
  const window30 = useMemo(() => recentDays(30, today), [today]);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      setState('signed-out');
      return;
    }

    const [logsRes, qadaRes] = await Promise.all([
      fetch(`/api/prayer-logs?from=${window30[0]}&to=${window30[29]}`),
      fetch('/api/qada')
    ]);

    if (!logsRes.ok || !qadaRes.ok) {
      setState('error');
      return;
    }

    setLogs((await logsRes.json()).logs);
    setQada((await qadaRes.json()).entries);
    setState('ready');
  }, [window30]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const dayMap = useMemo(() => toDayMap(logs), [logs]);
  const streak = useMemo(() => currentStreak(logs, today), [logs, today]);
  const todayKey = dayKey(today);

  async function setStatus(prayer: Prayer, status: PrayerStatus | null) {
    // Optimistic: a tap on a checkbox should never wait on a round trip.
    setLogs((prev) => {
      const rest = prev.filter(
        (l) => !(l.date === todayKey && l.prayer === prayer)
      );
      return status === null ? rest : [...rest, { date: todayKey, prayer, status }];
    });

    const res = await fetch('/api/prayer-logs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date: todayKey, prayer, status })
    });
    if (!res.ok) void refresh();
  }

  async function saveQada(entry: QadaEntry) {
    setQada((prev) => prev.map((e) => (e.prayer === entry.prayer ? entry : e)));
    const res = await fetch('/api/qada', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(entry)
    });
    if (!res.ok) void refresh();
  }

  if (state === 'loading') return <div className="h-64" aria-busy="true" />;

  if (state === 'signed-out') {
    return (
      <section className="border-s-2 border-brass ps-5">
        <h2 className="font-display text-2xl text-ink">{t('signedOut')}</h2>
        <p className="mt-2 max-w-prose text-sm text-muted">{t('signedOutNote')}</p>
        <Link
          href="/sign-in"
          className="mt-4 inline-block border border-glaze px-4 py-2 text-sm text-glaze transition-colors hover:bg-glaze hover:text-on-glaze"
        >
          {t('signIn')}
        </Link>
      </section>
    );
  }

  if (state === 'error') {
    return (
      <p role="alert" className="text-sm text-clay">
        {t('loadError')}
      </p>
    );
  }

  const todayRecord = dayMap.get(todayKey) ?? {};
  const owedTotal = totalOutstanding(qada);

  return (
    <div>
      <section className="border-s-2 border-glaze ps-5">
        <p className="text-sm text-muted">{t('streakLabel')}</p>
        <h2 className="mt-1 font-display text-4xl text-ink">
          {t('streakDays', { count: formatNumber(locale, streak) })}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {streak === 0 ? t('streakNoneNote') : t('streakNote')}
        </p>
      </section>

      <section className="mt-10">
        <h3 className="font-display text-xl text-ink">{t('todayHeading')}</h3>
        <ul className="mt-3 border-t border-line">
          {PRAYERS.map((prayer) => (
            <li key={prayer} className="border-b border-line py-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="min-w-20 text-ink">{t(`prayers.${prayer}`)}</span>
                <div className="flex flex-wrap gap-1.5">
                  {PRAYER_STATUSES.map((status) => {
                    const selected = todayRecord[prayer] === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setStatus(prayer, selected ? null : status)}
                        className={`border px-2.5 py-1 text-xs transition-colors ${
                          selected
                            ? 'border-glaze bg-glaze text-on-glaze'
                            : 'border-line text-muted hover:border-glaze hover:text-ink'
                        }`}
                      >
                        {t(`statuses.${status}`)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">{t('todayNote')}</p>
      </section>

      <section className="mt-10">
        <h3 className="font-display text-xl text-ink">{t('monthHeading')}</h3>
        <ol className="mt-4 flex flex-wrap gap-1.5">
          {window30.map((key) => {
            const complete = isDayComplete(dayMap.get(key));
            const logged = dayMap.has(key);
            const date = new Date(`${key}T12:00:00`);
            return (
              <li key={key}>
                <span
                  title={new Intl.DateTimeFormat(localeFormatTag[locale], {
                    day: 'numeric',
                    month: 'short'
                  }).format(date)}
                  className={`flex h-8 w-8 items-center justify-center border text-[10px] tabular-nums ${
                    complete
                      ? 'border-glaze bg-glaze text-on-glaze'
                      : logged
                        ? 'border-brass text-ink'
                        : 'border-line text-muted'
                  }`}
                >
                  {formatNumber(locale, date.getDate())}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-xs text-muted">{t('monthNote')}</p>
      </section>

      <section className="mt-10">
        <h3 className="font-display text-xl text-ink">{t('qadaHeading')}</h3>
        <p className="mt-2 max-w-prose text-sm text-muted">{t('qadaNote')}</p>
        {owedTotal > 0 && (
          <p className="mt-3 text-sm text-ink">
            {t('qadaRemaining', { count: formatNumber(locale, owedTotal) })}
          </p>
        )}
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-start text-xs text-muted">
              <th scope="col" className="py-2 text-start font-normal">
                {t('qadaPrayer')}
              </th>
              <th scope="col" className="py-2 text-start font-normal">
                {t('qadaOwed')}
              </th>
              <th scope="col" className="py-2 text-start font-normal">
                {t('qadaMadeUp')}
              </th>
              <th scope="col" className="py-2 text-end font-normal">
                {t('qadaLeft')}
              </th>
            </tr>
          </thead>
          <tbody>
            {qada.map((entry) => (
              <tr key={entry.prayer} className="border-b border-line">
                <td className="py-2 text-ink">{t(`prayers.${entry.prayer}`)}</td>
                <td className="py-2">
                  <CountInput
                    label={t('qadaOwedFor', { prayer: t(`prayers.${entry.prayer}`) })}
                    value={entry.owed}
                    onChange={(owed) => saveQada({ ...entry, owed })}
                  />
                </td>
                <td className="py-2">
                  <CountInput
                    label={t('qadaMadeUpFor', {
                      prayer: t(`prayers.${entry.prayer}`)
                    })}
                    value={entry.madeUp}
                    onChange={(madeUp) => saveQada({ ...entry, madeUp })}
                  />
                </td>
                <td className="py-2 text-end tabular-nums text-ink">
                  {formatNumber(locale, outstanding(entry))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="mt-10 max-w-prose text-xs text-muted">{t('privacyNote')}</p>
    </div>
  );
}

function CountInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <input
      type="number"
      min={0}
      inputMode="numeric"
      aria-label={label}
      value={value}
      onChange={(e) => {
        const next = Number(e.target.value);
        if (Number.isInteger(next) && next >= 0) onChange(next);
      }}
      dir="ltr"
      className="w-20 border border-line bg-raised px-2 py-1 text-ink text-start tabular-nums"
    />
  );
}
