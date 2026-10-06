import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import SurahIndex from '@/components/SurahIndex';
import { quranFetch } from '@/lib/quran/client';
import type { Chapter } from '@/lib/quran/types';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'modules.quran' });
  return { title: t('seoTitle'), description: t('summary') };
}

export default async function QuranPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('quran');

  let chapters: Chapter[] | null = null;
  try {
    // Translated chapter names come from the API, so the index is per locale.
    const data = await quranFetch<{ chapters: Chapter[] }>('chapters', {
      params: { language: locale }
    });
    chapters = data.chapters;
  } catch {
    // A reachable failure, not a crash: the rest of Sahn works without the
    // network, and the copy says so rather than leaving a blank screen.
    chapters = null;
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <h1 className="font-display text-3xl text-ink sm:text-4xl">
        {t('indexHeading')}
      </h1>
      <p className="mt-2 text-sm text-muted">{t('indexNote')}</p>

      <div className="mt-8">
        {chapters ? (
          <SurahIndex chapters={chapters} />
        ) : (
          <p role="alert" className="max-w-prose text-sm text-clay">
            {t('loadError')}
          </p>
        )}
      </div>
    </div>
  );
}
