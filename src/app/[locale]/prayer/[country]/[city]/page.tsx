import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import CityPrayerTimes from '@/components/CityPrayerTimes';
import { locales, type Locale } from '@/i18n/routing';
import { formatTime } from '@/lib/format';
import { computeDay } from '@/lib/prayer';
import {
  cityName,
  findCity,
  hasArabicPage,
  methodFor,
  shippedCities
} from '@/lib/prayer-pages/cities';
import { absolute } from '@/lib/site';

/** A day of stale times is acceptable; a build per day is not. */
export const revalidate = 86400;

/**
 * Cities outside the shipped set still resolve rather than 404.
 *
 * The launch set is deliberately small, but the dataset behind it is not, and
 * a link to a city we hold data for should work. They are simply absent from
 * the sitemap until they are promoted.
 */
export const dynamicParams = true;

type Params = { locale: string; country: string; city: string };

export function generateStaticParams() {
  return shippedCities().flatMap((city) =>
    locales
      // No Arabic page where there is no Arabic name. See cities.ts.
      .filter((locale) => locale === 'en' || hasArabicPage(city))
      .map((locale) => ({
        locale,
        country: city.country.toLowerCase(),
        city: city.slug
      }))
  );
}

function load(params: Params) {
  const city = findCity(params.country.toUpperCase(), params.city);
  if (!city) return null;
  if (params.locale === 'ar' && !hasArabicPage(city)) return null;
  return city;
}

export async function generateMetadata({
  params
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const resolved = await params;
  const city = load(resolved);
  if (!city) return {};

  const locale = resolved.locale as Locale;
  const t = await getTranslations({ locale, namespace: 'prayerPages' });
  const name = cityName(city, locale);
  const path = `/prayer/${city.country.toLowerCase()}/${city.slug}`;

  // Today's figures live in the description, which regenerates on revalidate.
  // They are deliberately absent from the OG image, which is cached far longer
  // and would otherwise be advertising yesterday's Fajr.
  const times = computeDay(city, new Date(), {
    method: methodFor(city.country),
    asr: 'standard',
    highLatitudeRule: 'auto'
  });

  const languages: Record<string, string> = {
    'en-GB': absolute(`/en${path}`),
    // x-default points at English on every page, including ones that have
    // both: with a large English-only set it is the only consistent target.
    'x-default': absolute(`/en${path}`)
  };
  if (hasArabicPage(city)) languages.ar = absolute(`/ar${path}`);

  return {
    title: t('metaTitle', { city: name, country: t(`countries.${city.country}`) }),
    description: t('metaDescription', {
      city: name,
      fajr: formatTime(locale, times.fajr, city.timeZone),
      maghrib: formatTime(locale, times.maghrib, city.timeZone)
    }),
    alternates: { canonical: absolute(`/${locale}${path}`), languages }
  };
}

export default async function CityPage({ params }: { params: Promise<Params> }) {
  const resolved = await params;
  setRequestLocale(resolved.locale);

  const city = load(resolved);
  if (!city) notFound();

  return <CityPrayerTimes city={city} locale={resolved.locale as Locale} />;
}
