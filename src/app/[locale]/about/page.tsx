import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { ABOUT, CORPUS } from '@/lib/about';
import { formatNumber } from '@/lib/format';
import { absolute } from '@/lib/site';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about' });
  return {
    title: t('title'),
    description: t('intro'),
    alternates: {
      canonical: absolute(`/${locale}/about`),
      languages: {
        'en-GB': absolute('/en/about'),
        ar: absolute('/ar/about'),
        'x-default': absolute('/en/about')
      }
    }
  };
}

export default async function AboutPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('about');
  const lang = locale as Locale;

  // Substituted rather than written into the prose, so the figures cannot
  // drift out of step with the database in one language and not the other.
  const values: Record<string, string> = {
    ayat: formatNumber(lang, CORPUS.ayat),
    hadith: formatNumber(lang, CORPUS.hadith),
    collections: formatNumber(lang, CORPUS.collections),
    duas: formatNumber(lang, CORPUS.duas)
  };

  const fill = (text: string) =>
    text.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <h1 className="font-display text-3xl text-ink sm:text-4xl">{t('title')}</h1>
      <p className="mt-4 max-w-prose text-base text-muted">{t('intro')}</p>

      {ABOUT.map((section) => (
        <section key={section.heading.en} className="mt-10">
          <h2 className="font-display text-xl text-ink">{section.heading[lang]}</h2>
          {fill(section.body[lang])
            .split('\n\n')
            .map((paragraph, i) => (
              <p
                key={i}
                className="mt-3 max-w-prose text-sm leading-relaxed text-ink"
              >
                {paragraph}
              </p>
            ))}
        </section>
      ))}
    </div>
  );
}
