'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { localeFormatTag, type Locale } from '@/i18n/routing';
import { formatDate, formatNumber, formatYear } from '@/lib/format';
import {
  currentDay,
  gregorianForDay,
  outstanding,
  ramadanMonth,
  relevantRamadanYear,
  summarise,
  type MissedFasts,
  type RamadanDay
} from '@/lib/ramadan';
import { createClient } from '@/lib/supabase/client';

type Load = 'loading' | 'signed-out' | 'ready' | 'error';

const EMPTY: Omit<RamadanDay, 'day'> = {
  fasted: null,
  taraweeh: null,
  juz_read: null,
  reflection: null
};

export default function RamadanPlanner() {
  const t = useTranslations('ramadan');
  const locale = useLocale() as Locale;
  const tag = localeFormatTag[locale];

  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(() => relevantRamadanYear(today));
  const month = useMemo(() => ramadanMonth(year), [year]);
  const dayNow = currentDay(month, today);

  const [state, setState] = useState<Load>('loading');
  const [days, setDays] = useState<Map<number, RamadanDay>>(new Map());
  const [missed, setMissed] = useState<MissedFasts | null>(null);
  const [openDay, setOpenDay] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      setState('signed-out');
      return;
    }

    const res = await fetch(`/api/ramadan?year=${year}`).catch(() => null);
    if (!res?.ok) {
      setState('error');
      return;
    }
    const data = await res.json();
    setDays(new Map((data.days as RamadanDay[]).map((d) => [d.day, d])));
    setMissed(data.missed as MissedFasts);
    setState('ready');
  }, [year]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const dayOf = useCallback(
    (n: number): RamadanDay => days.get(n) ?? { day: n, ...EMPTY },
    [days]
  );

  /** Optimistic: the grid must respond to a tap immediately. */
  async function setDay(n: number, changes: Partial<RamadanDay>) {
    const next = { ...dayOf(n), ...changes };
    setDays((prev) => new Map(prev).set(n, next));

    const res = await fetch('/api/ramadan', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hijri_year: year, day: n, ...changes })
    }).catch(() => null);

    // Put the row back the way the server has it rather than leaving a tick
    // on screen that was never saved.
    if (!res?.ok) void refresh();
  }

  async function setMissedFasts(changes: Partial<MissedFasts>) {
    if (!missed) return;
    setMissed({ ...missed, ...changes });
    const res = await fetch('/api/ramadan', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hijri_year: year, ...changes })
    }).catch(() => null);
    if (!res?.ok) void refresh();
  }

  const progress = useMemo(
    () => summarise([...days.values()], month, today),
    [days, month, today]
  );

  if (state === 'loading') {
    return <p className="mt-8 text-sm text-muted">{t('loading')}</p>;
  }

  if (state === 'signed-out') {
    return (
      <p className="mt-8 text-sm text-muted">
        {t('signedOut')}{' '}
        <Link href="/sign-in" className="text-glaze underline underline-offset-2">
          {t('signIn')}
        </Link>
      </p>
    );
  }

  if (state === 'error') {
    return <p className="mt-8 text-sm text-clay">{t('loadFailed')}</p>;
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setYear((y) => y - 1)}
          className="border border-line px-2.5 py-1 text-sm text-muted hover:text-ink"
        >
          {formatYear(locale, year - 1)}
        </button>
        <span className="font-display text-lg text-ink">
          {t('hijriYear', { year: formatYear(locale, year) })}
        </span>
        <button
          type="button"
          onClick={() => setYear((y) => y + 1)}
          className="border border-line px-2.5 py-1 text-sm text-muted hover:text-ink"
        >
          {formatYear(locale, year + 1)}
        </button>
      </div>

      <p className="mt-2 text-sm text-muted">
        {t('range', {
          from: formatDate(locale, month.start),
          to: formatDate(locale, month.end),
          days: formatNumber(locale, month.length)
        })}
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t('stats.fasted')} value={`${formatNumber(locale, progress.fasted)} / ${formatNumber(locale, progress.elapsed || month.length)}`} />
        <Stat label={t('stats.taraweeh')} value={formatNumber(locale, progress.taraweeh)} />
        <Stat label={t('stats.juz')} value={`${formatNumber(locale, progress.juzRead)} / ${formatNumber(locale, 30)}`} />
        <Stat
          label={t('stats.owed')}
          value={formatNumber(locale, missed ? outstanding(missed) : 0)}
        />
      </dl>

      <h2 className="mt-10 font-display text-xl text-ink">{t('daysHeading')}</h2>
      <ul className="mt-3 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
        {Array.from({ length: month.length }, (_, i) => i + 1).map((n) => {
          const entry = dayOf(n);
          const date = gregorianForDay(month, n);
          const isToday = n === dayNow;
          const future = dayNow !== null && n > dayNow;

          return (
            <li key={n} className="bg-raised">
              <div
                className={`flex items-center gap-3 px-3 py-2.5 ${
                  isToday ? 'border-s-2 border-glaze' : ''
                }`}
              >
                <span className="w-6 shrink-0 text-sm text-muted">
                  {formatNumber(locale, n)}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted">
                  {new Intl.DateTimeFormat(tag, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short'
                  }).format(date)}
                </span>

                <Toggle
                  on={entry.fasted}
                  disabled={future}
                  label={t('fasted')}
                  onClick={() =>
                    void setDay(n, { fasted: entry.fasted === true ? null : true })
                  }
                >
                  {t('short.fast')}
                </Toggle>
                <Toggle
                  on={entry.taraweeh}
                  disabled={future}
                  label={t('taraweeh')}
                  onClick={() =>
                    void setDay(n, {
                      taraweeh: entry.taraweeh === true ? null : true
                    })
                  }
                >
                  {t('short.taraweeh')}
                </Toggle>

                <button
                  type="button"
                  onClick={() => setOpenDay(openDay === n ? null : n)}
                  aria-expanded={openDay === n}
                  className="shrink-0 text-xs text-muted underline underline-offset-2 hover:text-ink"
                >
                  {t('more')}
                </button>
              </div>

              {openDay === n && (
                <div className="border-t border-line px-3 py-3">
                  <label className="block text-xs text-muted">
                    {t('juzLabel')}
                  </label>
                  <select
                    value={entry.juz_read ?? ''}
                    onChange={(e) =>
                      void setDay(n, {
                        juz_read: e.target.value ? Number(e.target.value) : null
                      })
                    }
                    className="mt-1 border border-line bg-raised px-2 py-1.5 text-sm text-ink"
                  >
                    <option value="">{t('juzNone')}</option>
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
                      <option key={j} value={j}>
                        {formatNumber(locale, j)}
                      </option>
                    ))}
                  </select>

                  <label className="mt-3 block text-xs text-muted">
                    {t('reflectionLabel')}
                  </label>
                  <textarea
                    defaultValue={entry.reflection ?? ''}
                    rows={3}
                    maxLength={4000}
                    // Saved on blur, not on every keystroke: this is a private
                    // note, not a chat box, and a write per character would be
                    // both wasteful and jumpy.
                    onBlur={(e) =>
                      void setDay(n, { reflection: e.target.value || null })
                    }
                    className="mt-1 w-full border border-line bg-raised px-2 py-1.5 text-sm text-ink text-start"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <h2 className="mt-10 font-display text-xl text-ink">{t('missedHeading')}</h2>
      <p className="mt-2 max-w-prose text-sm text-muted">{t('missedBody')}</p>

      {missed && (
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <Counter
            label={t('missedCount')}
            value={missed.count}
            locale={locale}
            onChange={(v) => void setMissedFasts({ count: v })}
          />
          <Counter
            label={t('madeUp')}
            value={missed.made_up}
            locale={locale}
            onChange={(v) => void setMissedFasts({ made_up: v })}
          />
          <label className="flex items-center gap-2 pb-1.5 text-sm text-ink">
            <input
              type="checkbox"
              checked={missed.fidya_paid}
              onChange={(e) => void setMissedFasts({ fidya_paid: e.target.checked })}
              className="accent-glaze"
            />
            {t('fidyaPaid')}
          </label>
        </div>
      )}

      <p className="mt-6 border-s-2 border-line ps-4 text-sm text-muted">
        {t('note')}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line px-3 py-2.5">
      <dt className="text-[10px] tracking-wider text-muted uppercase">{label}</dt>
      <dd className="mt-1 font-display text-lg text-ink">{value}</dd>
    </div>
  );
}

function Toggle({
  on,
  disabled,
  label,
  onClick,
  children
}: {
  on: boolean | null;
  disabled: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on === true}
      aria-label={label}
      className={`shrink-0 border px-2 py-1 text-[11px] transition-colors disabled:opacity-30 ${
        on === true
          ? 'border-glaze bg-glaze text-on-glaze'
          : 'border-line text-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

function Counter({
  label,
  value,
  locale,
  onChange
}: {
  label: string;
  value: number;
  locale: Locale;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <span className="block text-xs text-muted">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(value - 1, 0))}
          className="border border-line px-2 py-1 text-sm text-muted hover:text-ink"
        >
          −
        </button>
        <span className="min-w-8 text-center font-display text-lg text-ink">
          {formatNumber(locale, value)}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(value + 1, 400))}
          className="border border-line px-2 py-1 text-sm text-muted hover:text-ink"
        >
          +
        </button>
      </div>
    </div>
  );
}
