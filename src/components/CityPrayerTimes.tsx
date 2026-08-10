import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { formatNumber, formatTime } from '@/lib/format';
import { computeDay, qiblaBearing, TIME_SLOTS, type PrayerSettings } from '@/lib/prayer';
import {
  ATTRIBUTION,
  APPROXIMATED,
  cityName,
  methodFor,
  nearestCities,
  type City
} from '@/lib/prayer-pages/cities';
import { faqFor, sectionsFor, yearShape } from '@/lib/prayer-pages/content';
import { absolute } from '@/lib/site';
import CityAssistantCard from './CityAssistantCard';
import JsonLd from './JsonLd';
import NextPrayerCountdown from './NextPrayerCountdown';

/**
 * A city's prayer-times page.
 *
 * Rendered entirely on the server. A crawler that runs no JavaScript still
 * sees today's times, the month, the Qibla bearing and the explanation; the
 * only thing hydration adds is a live countdown. That ordering is deliberate:
 * a page whose content arrives with the client bundle is a page Google may
 * decide not to index.
 */
export default async function CityPrayerTimes({
  city,
  locale
}: {
  city: City;
  locale: Locale;
}) {
  const t = await getTranslations('prayerPages');
  const method = methodFor(city.country);
  const settings: PrayerSettings = {
    method,
    asr: 'standard',
    highLatitudeRule: 'auto'
  };

  const today = new Date();
  const times = computeDay(city, today, settings);
  const bearing = qiblaBearing(city);
  const shape = yearShape(city);
  const sections = sectionsFor(city, shape);
  const faqs = faqFor(city);
  const neighbours = nearestCities(city);
  const name = cityName(city, locale);

  // The whole current month, so the page is worth returning to rather than a
  // single figure anyone could get from a search result snippet.
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const days = Array.from({ length: monthEnd.getDate() }, (_, i) => {
    const date = new Date(monthStart);
    date.setDate(i + 1);
    return { date, times: computeDay(city, date, settings) };
  });

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowTimes = computeDay(city, tomorrow, settings);

  const faqValues: Record<string, string> = {
    city: name,
    fajr: formatTime(locale, times.fajr, city.timeZone),
    isha: formatTime(locale, times.isha, city.timeZone),
    tomorrowFajr: formatTime(locale, tomorrowTimes.fajr, city.timeZone),
    bearing: formatNumber(locale, Math.round(bearing)),
    method: t(`methods.${method}`)
  };

  const path = `/prayer/${city.country.toLowerCase()}/${city.slug}`;
  const countryName = t(`countries.${city.country}`);

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: t('allPrayerTimes'),
                  item: absolute(`/${locale}/prayer`)
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: countryName,
                  item: absolute(`/${locale}/prayer/${city.country.toLowerCase()}`)
                },
                { '@type': 'ListItem', position: 3, name }
              ]
            },
            {
              '@type': 'FAQPage',
              mainEntity: faqs.map((key) => ({
                '@type': 'Question',
                name: t(`faq.${key}.q`, faqValues),
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: t(`faq.${key}.a`, faqValues)
                }
              }))
            },
            {
              '@type': 'WebPage',
              name: t('cityHeading', { city: name }),
              url: absolute(`/${locale}${path}`),
              inLanguage: locale,
              about: {
                '@type': 'Place',
                name,
                address: {
                  '@type': 'PostalAddress',
                  addressLocality: name,
                  addressCountry: city.country
                },
                geo: {
                  '@type': 'GeoCoordinates',
                  latitude: city.latitude,
                  longitude: city.longitude
                }
              },
              spatialCoverage: {
                '@type': 'Place',
                name,
                geo: {
                  '@type': 'GeoCoordinates',
                  latitude: city.latitude,
                  longitude: city.longitude
                }
              }
            }
          ]
        }}
      />

      <nav aria-label={t('breadcrumb')} className="text-xs text-muted">
        <Link href="/prayer" className="hover:text-ink">
          {t('allPrayerTimes')}
        </Link>
        {' / '}
        <Link href={`/prayer/${city.country.toLowerCase()}`} className="hover:text-ink">
          {t(`countries.${city.country}`)}
        </Link>
      </nav>

      <h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
        {t('cityHeading', { city: name })}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {t('todayLine', {
          date: new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: city.timeZone
          }).format(today)
        })}
      </p>

      <NextPrayerCountdown
        city={{ latitude: city.latitude, longitude: city.longitude }}
        timeZone={city.timeZone}
        method={method}
      />

      <table className="mt-6 w-full border-t border-line text-start">
        <caption className="sr-only">{t('todayTable', { city: name })}</caption>
        <tbody>
          {TIME_SLOTS.map((slot) => (
            <tr key={slot} className="border-b border-line">
              <th scope="row" className="py-2.5 text-start font-normal text-muted">
                {t(`slots.${slot}`)}
              </th>
              <td className="py-2.5 text-end font-display text-xl text-ink tabular-nums">
                {formatTime(locale, times[slot], city.timeZone)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mt-10">
        <h2 className="font-display text-xl text-ink">{t('qiblaHeading')}</h2>
        <p className="mt-2 max-w-prose text-sm text-muted">
          {t('qiblaBody', {
            city: name,
            bearing: formatNumber(locale, Math.round(bearing))
          })}
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl text-ink">{t('methodHeading')}</h2>
        <p className="mt-2 max-w-prose text-sm text-muted">
          {t(`methodWhy.${method}`, { country: t(`countries.${city.country}`) })}
        </p>
        {APPROXIMATED.has(city.country) && (
          <p className="mt-2 max-w-prose text-sm text-clay">
            {t('methodApproximatedNote')}
          </p>
        )}
      </section>

      {sections.map((section) => (
        <section key={section.key} className="mt-10">
          <h2 className="font-display text-xl text-ink">
            {t(`sections.${section.key}.heading`)}
          </h2>
          <p className="mt-2 max-w-prose text-sm text-muted">
            {t(`sections.${section.key}.body`, { city: name, ...section.values })}
          </p>
        </section>
      ))}

      <section className="mt-10">
        <h2 className="font-display text-xl text-ink">
          {t('monthHeading', { city: name })}
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-t border-line text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th scope="col" className="py-2 text-start font-normal">
                  {t('slots.date')}
                </th>
                {TIME_SLOTS.map((slot) => (
                  <th key={slot} scope="col" className="py-2 text-end font-normal">
                    {t(`slots.${slot}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map(({ date, times: dayTimes }) => (
                <tr
                  key={date.toISOString()}
                  className={`border-b border-line ${
                    date.getDate() === today.getDate() ? 'bg-sunk' : ''
                  }`}
                >
                  <th scope="row" className="py-1.5 text-start font-normal text-muted">
                    {formatNumber(locale, date.getDate())}
                  </th>
                  {TIME_SLOTS.map((slot) => (
                    <td key={slot} className="py-1.5 text-end tabular-nums text-ink">
                      {formatTime(locale, dayTimes[slot], city.timeZone)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl text-ink">{t('faqHeading')}</h2>
        <dl className="mt-3 border-t border-line">
          {faqs.map((key) => (
            <div key={key} className="border-b border-line py-4">
              <dt className="text-ink">{t(`faq.${key}.q`, faqValues)}</dt>
              <dd className="mt-1.5 text-sm text-muted">{t(`faq.${key}.a`, faqValues)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <CityAssistantCard
        source={`/${locale}/prayer/${city.country.toLowerCase()}/${city.slug}`}
        prompt={t('assistantPrompt')}
      />

      <section className="mt-10">
        <h2 className="font-display text-xl text-ink">{t('nearbyHeading')}</h2>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {neighbours.map((near) => (
            <li key={`${near.country}-${near.slug}`}>
              <Link
                href={`/prayer/${near.country.toLowerCase()}/${near.slug}`}
                className="text-glaze underline underline-offset-2"
              >
                {cityName(near, locale)}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 border-t border-line pt-4 text-xs text-muted">
        {t('attribution', { source: ATTRIBUTION })}
      </p>
    </div>
  );
}
