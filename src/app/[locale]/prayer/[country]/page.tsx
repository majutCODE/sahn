import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { locales, type Locale } from '@/i18n/routing';
import { formatNumber } from '@/lib/format';
import {
  ATTRIBUTION,
  cityName,
  hasArabicPage,
  shippedCities,
  shippedCountries
} from '@/lib/prayer-pages/cities';
import { absolute } from '@/lib/site';

export const revalidate = 86400;
export const dynamicParams = true;

type Params = { locale: string; country: string };

export function generateStaticParams() {
  return shippedCountries().flatMap((country) =>
    locales.map((locale) => ({ locale, country: country.toLowerCase() }))
  );
}

export async function generateMetadata({
  params
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, country } = await params;
  const code = country.toUpperCase();
  if (!shippedCountries().includes(code)) return {};

  const t = await getTranslations({ locale, namespace: 'prayerPages' });
  const path = `/prayer/${country}`;
  const name = t(`countries.${code}`);

  return {
    title: t('countryMetaTitle', { country: name }),
    description: t('countryMetaDescription', { country: name }),
    alternates: {
      canonical: absolute(`/${locale}${path}`),
      languages: {
        'en-GB': absolute(`/en${path}`),
        ar: absolute(`/ar${path}`),
        'x-default': absolute(`/en${path}`)
      }
    }
  };
}

export default async function CountryPage({ params }: { params: Promise<Params> }) {
  const { locale, country } = await params;
  setRequestLocale(locale);

  const code = country.toUpperCase();
  if (!shippedCountries().includes(code)) notFound();

  const t = await getTranslations('prayerPages');
  const lang = locale as Locale;
  const cities = shippedCities()
    .filter((c) => c.country === code)
    .sort((a, b) => b.population - a.population);

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <nav aria-label={t('breadcrumb')} className="text-xs text-muted">
        <Link href="/prayer" className="hover:text-ink">
          {t('allPrayerTimes')}
        </Link>
      </nav>

      <h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
        {t('countryHeading', { country: t(`countries.${code}`) })}
      </h1>
      <p className="mt-2 max-w-prose text-sm text-muted">
        {t('countryIntro', {
          country: t(`countries.${code}`),
          count: formatNumber(lang, cities.length)
        })}
      </p>

      <ul className="mt-6 border-t border-line">
        {cities.map((city) => {
          // On an Arabic hub, a city with no Arabic page is linked to its
          // English one and marked as such. The reader reaches the content,
          // and no reciprocal alternates claim is made, so the hreflang
          // annotations stay clean.
          const arabicMissing = lang === 'ar' && !hasArabicPage(city);
          const href = `/prayer/${country}/${city.slug}`;

          return (
            <li key={city.slug} className="border-b border-line">
              {arabicMissing ? (
                <a
                  href={absolute(`/en${href}`)}
                  hrefLang="en"
                  lang="en"
                  dir="ltr"
                  className="flex items-baseline justify-between gap-4 py-3 text-start hover:bg-sunk"
                >
                  <span className="text-ink">{city.name}</span>
                  <span className="text-xs text-muted">{t('englishOnly')}</span>
                </a>
              ) : (
                <Link
                  href={href}
                  className="flex items-baseline justify-between gap-4 py-3 hover:bg-sunk"
                >
                  <span className="text-ink">{cityName(city, lang)}</span>
                  <span className="text-xs text-muted tabular-nums">
                    {formatNumber(lang, city.population)}
                  </span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-10 border-t border-line pt-4 text-xs text-muted">
        {t('attribution', { source: ATTRIBUTION })}
      </p>
    </div>
  );
}
