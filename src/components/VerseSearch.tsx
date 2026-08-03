'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { formatNumber } from '@/lib/format';

type Verse = {
  surah: number;
  ayah: number;
  arabic: string;
  text: string;
  similarity: number;
};

type State = 'idle' | 'searching' | 'done' | 'error';

export default function VerseSearch() {
  const t = useTranslations('verseSearch');
  const locale = useLocale() as Locale;
  const [query, setQuery] = useState('');
  const [verses, setVerses] = useState<Verse[]>([]);
  const [state, setState] = useState<State>('idle');

  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2) return;
    setState('searching');

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: query.trim() })
      });
      if (!res.ok) {
        setState('error');
        return;
      }
      const data = await res.json();
      setVerses(data.verses);
      setState('done');
    } catch {
      setState('error');
    }
  }

  return (
    <div>
      <form onSubmit={search}>
        <label htmlFor="verse-query" className="block text-sm text-ink">
          {t('label')}
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            id="verse-query"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('placeholder')}
            className="min-w-0 flex-1 border border-line bg-raised px-3 py-2.5 text-ink text-start"
          />
          <button
            type="submit"
            disabled={state === 'searching' || query.trim().length < 2}
            className="border border-glaze bg-glaze px-4 py-2.5 text-sm text-on-glaze transition-colors enabled:hover:bg-transparent enabled:hover:text-glaze disabled:opacity-40"
          >
            {state === 'searching' ? t('searching') : t('submit')}
          </button>
        </div>
      </form>

      {state === 'error' && (
        <p role="alert" className="mt-6 text-sm text-clay">
          {t('error')}
        </p>
      )}

      {state === 'done' && verses.length === 0 && (
        <p className="mt-6 text-sm text-muted">{t('noResults')}</p>
      )}

      {verses.length > 0 && (
        <>
          <p className="mt-8 text-xs text-muted">
            {t('resultsLabel', { count: formatNumber(locale, verses.length) })}
          </p>
          <ol className="mt-2 border-t border-line">
            {verses.map((v) => (
              <li key={`${v.surah}:${v.ayah}`} className="border-b border-line py-5">
                <p className="quran text-xl text-ink" dir="rtl" lang="ar">
                  {v.arabic}
                </p>
                <p className="mt-3 text-base text-muted">{v.text}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="text-xs tabular-nums text-muted" dir="ltr">
                    {formatNumber(locale, v.surah)}:{formatNumber(locale, v.ayah)}
                  </span>
                  <Link
                    href={`/quran/${v.surah}#ayah-${v.ayah}`}
                    className="text-xs text-glaze underline underline-offset-2"
                  >
                    {t('openReader')}
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      <p className="mt-8 max-w-prose text-xs text-muted">{t('note')}</p>
    </div>
  );
}
