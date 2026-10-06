import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PrayerTimesPanel from '@/components/PrayerTimesPanel';
import QiblaPanel from '@/components/QiblaPanel';
import { Link } from '@/i18n/navigation';
import { shippedCountries } from '@/lib/prayer-pages/cities';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'modules.prayer' });
  return { title: t('seoTitle'), description: t('summary') };
}

export default async function PrayerPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('qibla');
  const tp = await getTranslations('prayerPages');
  const tm = await getTranslations();

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <h1 className="font-display text-3xl text-ink sm:text-4xl">
        {tm('modules.prayer.name')}
      </h1>
      <p className="mt-3 mb-8 max-w-prose text-base text-muted">
        {tm('modules.prayer.summary')}
      </p>
      <PrayerTimesPanel />

      <section className="mt-14 border-t border-line pt-10">
        <h2 className="mb-6 font-display text-2xl text-ink">{t('heading')}</h2>
        <QiblaPanel />
      </section>

      {/* The global hub, appended below the tool rather than replacing it.
          Real anchors rendered on the server: a crawler that follows router
          pushes does not exist, and this is the only path into the city
          pages that Google will ever walk. */}
      <section className="mt-14 border-t border-line pt-10">
        <h2 className="font-display text-2xl text-ink">{tp('hubHeading')}</h2>
        <p className="mt-2 max-w-prose text-sm text-muted">{tp('hubIntro')}</p>
        <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {shippedCountries().map((code) => (
            <li key={code}>
              <Link
                href={`/prayer/${code.toLowerCase()}`}
                className="text-glaze underline underline-offset-2"
              >
                {tp(`countries.${code}`)}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
