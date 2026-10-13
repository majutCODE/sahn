import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import SurahReader from '@/components/SurahReader';
import { surahByNumber } from '@/lib/hifz';
import { fetchRecitation } from '@/lib/quran/audio';
import { defaultTranslationFor } from '@/lib/quran/resources';
import { fetchSurah } from '@/lib/quran/surah';
import { absolute } from '@/lib/site';

type Params = { params: Promise<{ locale: string; surah: string }> };

function parseSurah(value: string): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 114 ? n : null;
}

/**
 * Built from content/surahs.json rather than from the API.
 *
 * The previous version fetched the chapter to get its name, which made the
 * page title depend on a third-party request completing. When it did not, the
 * page went out titled "Quran" or, for an unparsed id, with no title at all -
 * and Google has at least one of these indexed as "Untitled". A title is the
 * strongest on-page signal there is and it cannot be contingent on a network
 * call. The 114 names are fixed and already on disk.
 *
 * These are also the pages Google actually surfaces for the site, and they
 * carried the weakest metadata on it: no description, no canonical, no
 * hreflang, while the prayer pages had all three.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, surah } = await params;
  const id = parseSurah(surah);
  const info = id ? surahByNumber(id) : undefined;
  if (!info) return {};

  const t = await getTranslations({ locale, namespace: 'quran' });
  const path = `/quran/${info.surah}`;
  const name = locale === 'ar' ? info.arabic : info.name;
  const values = {
    surah: name,
    number: info.surah,
    ayat: info.ayat,
    revelation: t(`revelation.${info.revelation}`)
  };

  return {
    title: t('metaTitle', values),
    description: t('metaDescription', values),
    alternates: {
      canonical: absolute(`/${locale}${path}`),
      languages: {
        'en-GB': absolute(`/en${path}`),
        ar: absolute(`/ar${path}`),
        'x-default': absolute(`/en${path}`)
      }
    },
    openGraph: {
      type: 'article',
      url: absolute(`/${locale}${path}`),
      title: t('metaTitle', values),
      description: t('metaDescription', values),
      locale: locale === 'ar' ? 'ar_AR' : 'en_GB'
    }
  };
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
