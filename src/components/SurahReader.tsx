'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { formatNumber } from '@/lib/format';
import { starPath } from '@/lib/girih';
import type { ReaderAyah } from '@/lib/quran/surah';
import type { Chapter } from '@/lib/quran/types';

const SCALES = [1, 1.15, 1.3, 1.5] as const;
const PREFS_KEY = 'sahn:quran-prefs';

type Prefs = { scale: number; arabicOnly: boolean };

export default function SurahReader({
  chapter,
  ayat
}: {
  chapter: Chapter;
  ayat: ReaderAyah[];
}) {
  const t = useTranslations('quran');
  const locale = useLocale() as Locale;
  const [prefs, setPrefs] = useState<Prefs | null>(null);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null');
      setPrefs({
        scale: SCALES.includes(raw?.scale) ? raw.scale : 1,
        arabicOnly: raw?.arabicOnly === true
      });
    } catch {
      setPrefs({ scale: 1, arabicOnly: false });
    }
  }, []);

  function update(patch: Partial<Prefs>) {
    setPrefs((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        // Private browsing. Preferences last the session and that is enough.
      }
      return next;
    });
  }

  const scale = prefs?.scale ?? 1;
  const arabicOnly = prefs?.arabicOnly ?? false;
  const hasTranslation = ayat.some((a) => a.translation);

  return (
    <div>
      <header className="border-b border-line pb-6">
        <div className="flex items-baseline gap-3">
          <span className="text-sm tabular-nums text-muted">
            {formatNumber(locale, chapter.id)}
          </span>
          <h1 className="font-display text-3xl text-ink sm:text-4xl">
            {chapter.name_simple}
          </h1>
        </div>
        <p className="quran mt-2 text-3xl text-ink" dir="rtl" lang="ar">
          {chapter.name_arabic}
        </p>
        <p className="mt-2 text-sm text-muted">
          {t(`revelation.${chapter.revelation_place}`)} ·{' '}
          {t('versesCount', { count: formatNumber(locale, chapter.verses_count) })}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-line py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">{t('fontSize')}</span>
          <div className="flex gap-1">
            {SCALES.map((value, i) => (
              <button
                key={value}
                type="button"
                aria-pressed={scale === value}
                aria-label={t('fontSizeStep', {
                  step: formatNumber(locale, i + 1)
                })}
                onClick={() => update({ scale: value })}
                className={`border px-2 py-1 text-xs ${
                  scale === value
                    ? 'border-glaze bg-glaze text-on-glaze'
                    : 'border-line text-muted hover:text-ink'
                }`}
              >
                {'A'}
                <span style={{ fontSize: `${0.6 + i * 0.15}rem` }}>A</span>
              </button>
            ))}
          </div>
        </div>

        {hasTranslation && (
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={arabicOnly}
              onChange={(e) => update({ arabicOnly: e.target.checked })}
              className="accent-[var(--accent)]"
            />
            {t('arabicOnly')}
          </label>
        )}
      </div>

      {/* Surah 9 is the one surah that opens without the basmala. */}
      {chapter.bismillah_pre && (
        <p
          className="quran mt-8 text-center text-ink"
          dir="rtl"
          lang="ar"
          style={{ fontSize: `${1.35 * scale}rem` }}
        >
          بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
        </p>
      )}

      <ol className="mt-8">
        {ayat.map((ayah) => (
          <li
            key={ayah.key}
            id={`ayah-${ayah.number}`}
            className="scroll-mt-4 border-b border-line py-6"
          >
            <p
              className="quran text-ink"
              dir="rtl"
              lang="ar"
              style={{ fontSize: `${1.5 * scale}rem` }}
            >
              {ayah.arabic}
              <AyahMark number={ayah.number} locale={locale} />
            </p>

            {!arabicOnly && ayah.translation && (
              <p className="mt-3 text-base leading-relaxed text-muted">
                {ayah.translation}
              </p>
            )}
          </li>
        ))}
      </ol>

      <nav className="mt-8 flex items-center justify-between gap-4 text-sm">
        {chapter.id > 1 ? (
          <Link href={`/quran/${chapter.id - 1}`} className="text-glaze">
            {t('previousSurah')}
          </Link>
        ) : (
          <span />
        )}
        {chapter.id < 114 && (
          <Link href={`/quran/${chapter.id + 1}`} className="text-glaze">
            {t('nextSurah')}
          </Link>
        )}
      </nav>
    </div>
  );
}

/** The ayah number set in an eight-point star, as in a printed mushaf. */
function AyahMark({ number, locale }: { number: number; locale: Locale }) {
  return (
    <span className="relative mx-1 inline-flex h-[1.6em] w-[1.6em] shrink-0 items-center justify-center align-middle">
      <svg
        viewBox="0 0 40 40"
        className="absolute inset-0 h-full w-full text-brass"
        aria-hidden="true"
      >
        <path d={starPath(20, 20, 19, 0)} fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
      <span className="relative font-sans text-[0.4em] tabular-nums text-muted">
        {formatNumber(locale, number)}
      </span>
    </span>
  );
}
