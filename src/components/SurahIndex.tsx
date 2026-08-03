'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { formatNumber } from '@/lib/format';
import type { Chapter } from '@/lib/quran/types';

export default function SurahIndex({ chapters }: { chapters: Chapter[] }) {
  const t = useTranslations('quran');
  const locale = useLocale() as Locale;
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chapters;
    return chapters.filter(
      (c) =>
        String(c.id) === q ||
        c.name_simple.toLowerCase().includes(q) ||
        c.name_arabic.includes(query.trim()) ||
        c.translated_name.name.toLowerCase().includes(q)
    );
  }, [chapters, query]);

  return (
    <div>
      <label htmlFor="surah-search" className="block text-xs text-muted">
        {t('searchLabel')}
      </label>
      <input
        id="surah-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('searchPlaceholder')}
        className="mt-1 w-full border border-line bg-raised px-3 py-2 text-ink text-start sm:max-w-xs"
      />

      {results.length === 0 ? (
        <p className="mt-6 text-sm text-muted">{t('noMatches')}</p>
      ) : (
        <ol className="mt-5 border-t border-line">
          {results.map((chapter) => (
            <li key={chapter.id}>
              <Link
                href={`/quran/${chapter.id}`}
                className="flex items-center gap-4 border-b border-line px-1 py-3 transition-colors hover:bg-sunk"
              >
                <span className="w-8 shrink-0 text-sm tabular-nums text-muted">
                  {formatNumber(locale, chapter.id)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-ink">{chapter.name_simple}</span>
                  <span className="block text-xs text-muted">
                    {/* The API only has Arabic translated names for a handful
                        of surahs, and in Arabic the name itself is already
                        alongside — so the gloss is English-only. */}
                    {locale === 'en' && `${chapter.translated_name.name} · `}
                    {t(`revelation.${chapter.revelation_place}`)} ·{' '}
                    {t('versesCount', {
                      count: formatNumber(locale, chapter.verses_count)
                    })}
                  </span>
                </span>
                {/* Surah names are Quranic Arabic, so they take the Quran face
                    in both locales rather than the UI face. */}
                <span className="quran shrink-0 text-xl leading-none text-ink">
                  {chapter.name_arabic}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
