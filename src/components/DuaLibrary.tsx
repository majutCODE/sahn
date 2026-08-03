'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import type { Locale } from '@/i18n/routing';
import type { Dua } from '@/lib/duas/fetch';

export default function DuaLibrary({ duas }: { duas: Dua[] }) {
  const t = useTranslations('duas');
  const locale = useLocale() as Locale;
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const dua of duas) {
      for (const tg of dua.tags) counts.set(tg, (counts.get(tg) ?? 0) + 1);
    }
    // Busiest situations first — those are the ones people arrive looking for.
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name]) => name);
  }, [duas]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return duas.filter((dua) => {
      if (tag && !dua.tags.includes(tag)) return false;
      if (!q) return true;
      return (
        (dua.title[locale] ?? '').toLowerCase().includes(q) ||
        (dua.title.en ?? '').toLowerCase().includes(q) ||
        (dua.transliteration ?? '').toLowerCase().includes(q) ||
        (dua.translation ?? '').toLowerCase().includes(q) ||
        dua.tags.some((x) => x.includes(q)) ||
        dua.arabic.includes(query.trim())
      );
    });
  }, [duas, query, tag, locale]);

  return (
    <div>
      <label htmlFor="dua-search" className="block text-xs text-muted">
        {t('searchLabel')}
      </label>
      <input
        id="dua-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('searchPlaceholder')}
        className="mt-1 w-full border border-line bg-raised px-3 py-2 text-ink text-start sm:max-w-sm"
      />
      <p className="mt-2 text-xs text-muted">{t('searchNote')}</p>

      <ul className="mt-4 flex flex-wrap gap-1.5">
        {tags.map((name) => (
          <li key={name}>
            <button
              type="button"
              aria-pressed={tag === name}
              onClick={() => setTag(tag === name ? null : name)}
              className={`border px-2.5 py-1 text-xs transition-colors ${
                tag === name
                  ? 'border-glaze bg-glaze text-on-glaze'
                  : 'border-line text-muted hover:border-glaze hover:text-ink'
              }`}
            >
              {t.has(`tags.${name}`) ? t(`tags.${name}`) : name}
            </button>
          </li>
        ))}
      </ul>

      {results.length === 0 ? (
        <p className="mt-8 text-sm text-muted">{t('noMatches')}</p>
      ) : (
        <ol className="mt-8">
          {results.map((dua) => (
            <li key={dua.id} className="border-b border-line py-6">
              <h2 className="text-sm text-muted">
                {dua.title[locale] ?? dua.title.en ?? dua.slug}
              </h2>

              <p className="quran mt-3 text-2xl text-ink" dir="rtl" lang="ar">
                {dua.arabic}
              </p>

              {dua.transliteration && locale !== 'ar' && (
                <p className="mt-3 text-sm italic text-muted" dir="ltr">
                  {dua.transliteration}
                </p>
              )}

              {dua.translation ? (
                <p className="mt-3 text-base text-ink">{dua.translation}</p>
              ) : (
                locale !== 'ar' && (
                  <p className="mt-3 text-sm text-muted">
                    {t('translationPending')}
                  </p>
                )
              )}

              <p className="mt-3 text-xs text-muted">
                {dua.source_ref}
                {dua.quran_ref && ` · ${t('translationFromQuran')}`}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
