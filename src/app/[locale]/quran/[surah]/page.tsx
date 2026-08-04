import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import SurahReader from '@/components/SurahReader';
import { fetchRecitation } from '@/lib/quran/audio';
import { defaultTranslationFor } from '@/lib/quran/resources';
import { fetchSurah } from '@/lib/quran/surah';

type Params = { params: Promise<{ locale: string; surah: string }> };

function parseSurah(value: string): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 114 ? n : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, surah } = await params;
  const id = parseSurah(surah);
  if (!id) return {};
  const t = await getTranslations({ locale, namespace: 'modules.quran' });
  try {
    const { chapter } = await fetchSurah(id, { locale, translationId: null });
    return { title: `${chapter.name_simple} · ${t('name')}` };
  } catch {
    return { title: t('name') };
  }
}

export default async function SurahPage({ params }: Params) {
  const { locale, surah } = await params;
  setRequestLocale(locale);

  const id = parseSurah(surah);
  if (!id) notFound();

  const t = await getTranslations('quran');

  try {
    // Recitation is fetched beside the text but must never cost it: a
    // reciter's mirror being down is not a reason to fail a page of Qur'an.
    const [{ chapter, ayat }, audio] = await Promise.all([
      fetchSurah(id, { locale, translationId: defaultTranslationFor(locale) }),
      fetchRecitation(id).catch(() => [])
    ]);
    return (
      <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
        <SurahReader chapter={chapter} ayat={ayat} audio={audio} />
      </div>
    );
  } catch {
    return (
      <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
        <p role="alert" className="max-w-prose text-sm text-clay">
          {t('loadError')}
        </p>
      </div>
    );
  }
}
