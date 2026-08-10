import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';
import { starPath } from '@/lib/girih';
import { qiblaBearing } from '@/lib/prayer';
import { cityName, findCity } from '@/lib/prayer-pages/cities';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Sahn prayer times';

/**
 * Rendered on demand, never at build.
 *
 * Prerendering one of these per city would add thousands of image renders to
 * every deploy for something search does not read and few people share. More
 * to the point, everything in it is immutable - name, country, Qibla bearing
 * - so it can be cached hard. Today's times are deliberately absent: a CDN
 * holding an image that announces yesterday's Fajr would undermine the one
 * claim this product is built on. The daily figures live in the meta
 * description, which regenerates on the page's revalidate.
 */
export default async function Image({
  params
}: {
  params: { locale: string; country: string; city: string };
}) {
  const city = findCity(params.country.toUpperCase(), params.city);
  const t = await getTranslations({
    locale: params.locale,
    namespace: 'prayerPages'
  });

  const name = city ? cityName(city, params.locale) : 'Sahn';
  const bearing = city ? Math.round(qiblaBearing(city)) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#10202B',
          padding: '64px 72px',
          fontFamily: 'sans-serif'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <svg width="48" height="48" viewBox="0 0 40 40">
            <path d={starPath(20, 20, 19, 0)} fill="#1F6F6B" />
          </svg>
          <span style={{ fontSize: 40, color: '#F2EDE4' }}>Sahn</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 84, color: '#F2EDE4', lineHeight: 1.1 }}>
            {name}
          </span>
          <span style={{ fontSize: 38, color: '#1F6F6B', marginTop: 12 }}>
            {city ? t(`countries.${city.country}`) : ''}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            color: '#9AABB4',
            fontSize: 28
          }}
        >
          <span>{t('cityHeading', { city: name })}</span>
          {bearing !== null && <span>{t('ogQibla', { bearing })}</span>}
        </div>
      </div>
    ),
    size
  );
}
