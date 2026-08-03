'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { localeFormatTag, type Locale } from '@/i18n/routing';
import { formatDate, formatNumber, formatYear } from '@/lib/format';
import {
  HIJRI_MONTHS,
  fromHijri,
  hijriMonthLength,
  keyDates,
  recommendedFast,
  toHijri,
  utcNoon,
  type HijriDate
} from '@/lib/hijri';

const DAY = 86_400_000;

/** The Islamic week opens on al-Ahad, so the grid does too. */
const WEEK_START = 0;

export default function HijriCalendar() {
  const t = useTranslations('hijri');
  const locale = useLocale() as Locale;

  const today = useMemo(() => new Date(), []);
  const todayHijri = useMemo(() => toHijri(today), [today]);
  const [view, setView] = useState({
    year: todayHijri.year,
    month: todayHijri.month
  });

  const monthName = (month: number) =>
    locale === 'ar' ? HIJRI_MONTHS[month - 1].ar : HIJRI_MONTHS[month - 1].en;

  const days = useMemo(() => {
    const length = hijriMonthLength(view.year, view.month);
    const first = fromHijri({ ...view, day: 1 });
    return Array.from({ length }, (_, i) => {
      const gregorian = new Date(first.getTime() + i * DAY);
      const hijri: HijriDate = { ...view, day: i + 1 };
      return { hijri, gregorian, fast: recommendedFast(gregorian, hijri) };
    });
  }, [view]);

  const marks = useMemo(() => keyDates(view.year), [view.year]);
  const markByDay = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of marks) {
      if (m.hijri.month === view.month) map.set(m.hijri.day, m.id);
    }
    return map;
  }, [marks, view.month]);

  const weekdayNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(localeFormatTag[locale], {
      weekday: 'short',
      timeZone: 'UTC'
    });
    // 4 Jan 1970 was a Sunday — an arbitrary anchor for weekday names only.
    return Array.from({ length: 7 }, (_, i) =>
      fmt.format(new Date(Date.UTC(1970, 0, 4 + ((WEEK_START + i) % 7))))
    );
  }, [locale]);

  const leading = (utcNoon(days[0].gregorian).getUTCDay() - WEEK_START + 7) % 7;

  function shift(by: number) {
    setView((v) => {
      const index = (v.year * 12 + (v.month - 1) + by + 12000) % 12000;
      return { year: Math.floor(index / 12), month: (index % 12) + 1 };
    });
  }

  const isToday = (h: HijriDate) =>
    h.year === todayHijri.year &&
    h.month === todayHijri.month &&
    h.day === todayHijri.day;

  return (
    <div>
      <section className="border-s-2 border-glaze ps-5">
        <p className="text-sm text-muted">{t('todayLabel')}</p>
        <h2 className="mt-1 font-display text-3xl text-ink sm:text-4xl">
          {formatNumber(locale, todayHijri.day)} {monthName(todayHijri.month)}{' '}
          {formatYear(locale, todayHijri.year)}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {formatDate(locale, today, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}
        </p>
      </section>

      <div className="mt-10 flex items-center gap-3">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label={t('prevMonth')}
          className="border border-line px-3 py-1.5 text-ink hover:bg-sunk"
        >
          <Chevron direction="prev" />
        </button>
        <h3 className="flex-1 text-center font-display text-xl text-ink">
          {monthName(view.month)} {formatYear(locale, view.year)}
        </h3>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label={t('nextMonth')}
          className="border border-line px-3 py-1.5 text-ink hover:bg-sunk"
        >
          <Chevron direction="next" />
        </button>
      </div>

      <table className="mt-4 w-full table-fixed border-collapse">
        <thead>
          <tr>
            {weekdayNames.map((name) => (
              <th
                key={name}
                scope="col"
                className="pb-2 text-center text-xs font-normal text-muted"
              >
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chunk([...Array(leading).fill(null), ...days], 7).map((week, i) => (
            <tr key={i}>
              {week.map((cell, j) =>
                cell === null ? (
                  <td key={j} />
                ) : (
                  <td key={j} className="p-0.5 text-center align-top">
                    <div
                      aria-current={isToday(cell.hijri) ? 'date' : undefined}
                      className={`flex min-h-14 flex-col items-center justify-center gap-0.5 border p-1 ${
                        isToday(cell.hijri)
                          ? 'border-glaze bg-glaze text-on-glaze'
                          : markByDay.has(cell.hijri.day)
                            ? 'border-brass bg-raised'
                            : 'border-transparent'
                      }`}
                    >
                      <span className="text-sm tabular-nums">
                        {formatNumber(locale, cell.hijri.day)}
                      </span>
                      <span
                        className={`text-[10px] tabular-nums ${
                          isToday(cell.hijri) ? 'opacity-80' : 'text-muted'
                        }`}
                      >
                        {formatNumber(locale, cell.gregorian.getDate())}
                      </span>
                      {cell.fast && (
                        <span
                          title={t(`fasts.${cell.fast}`)}
                          className={`block h-1 w-1 rounded-full ${
                            isToday(cell.hijri) ? 'bg-on-glaze' : 'bg-clay'
                          }`}
                        >
                          <span className="sr-only">{t(`fasts.${cell.fast}`)}</span>
                        </span>
                      )}
                    </div>
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 text-xs text-muted">{t('fastsNote')}</p>

      <section className="mt-10">
        <h3 className="font-display text-xl text-ink">
          {t('keyDatesHeading', { year: formatYear(locale, view.year) })}
        </h3>
        <ul className="mt-3 border-t border-line">
          {marks.map((mark) => (
            <li
              key={mark.id}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line py-3"
            >
              <span className="flex-1 text-ink">{t(`keyDates.${mark.id}`)}</span>
              <span className="text-sm text-muted">
                {formatNumber(locale, mark.hijri.day)} {monthName(mark.hijri.month)}
              </span>
              <span className="text-sm text-ink">
                {formatDate(locale, mark.gregorian, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  timeZone: 'UTC'
                })}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Converter />

      <p className="mt-8 max-w-prose text-xs text-muted">{t('moonsightingNote')}</p>
    </div>
  );
}

function Converter() {
  const t = useTranslations('hijri');
  const locale = useLocale() as Locale;
  const [gregorian, setGregorian] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  const parsed = useMemo(() => {
    const [y, m, d] = gregorian.split('-').map(Number);
    if (!y || !m || !d) return null;
    const date = new Date(Date.UTC(y, m - 1, d, 12));
    return Number.isNaN(date.getTime()) ? null : date;
  }, [gregorian]);

  const hijri = parsed ? toHijri(parsed) : null;

  return (
    <section className="mt-10">
      <h3 className="font-display text-xl text-ink">{t('converterHeading')}</h3>
      <div className="mt-3 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="greg" className="block text-xs text-muted">
            {t('gregorianLabel')}
          </label>
          <input
            id="greg"
            type="date"
            value={gregorian}
            onChange={(e) => setGregorian(e.target.value)}
            dir="ltr"
            className="mt-1 border border-line bg-raised px-3 py-2 text-ink"
          />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted">{t('hijriLabel')}</p>
          <p className="mt-1 py-2 text-lg text-ink">
            {hijri
              ? `${formatNumber(locale, hijri.day)} ${
                  locale === 'ar'
                    ? HIJRI_MONTHS[hijri.month - 1].ar
                    : HIJRI_MONTHS[hijri.month - 1].en
                } ${formatYear(locale, hijri.year)}`
              : '—'}
          </p>
        </div>
      </div>
    </section>
  );
}

/** Direction-aware chevron: "previous" points against the reading direction. */
function Chevron({ direction }: { direction: 'prev' | 'next' }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden="true"
      className={direction === 'prev' ? 'rtl:-scale-x-100' : 'rotate-180 rtl:-scale-x-100'}
    >
      <path d="M10 2 4 8l6 6" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  // Pad the last row so the table stays rectangular.
  const last = out[out.length - 1];
  while (last && last.length < size) last.push(null as T);
  return out;
}
