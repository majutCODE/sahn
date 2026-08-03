import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PrayerTimesPanel from '@/components/PrayerTimesPanel';
import QiblaPanel from '@/components/QiblaPanel';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'modules.prayer' });
  return { title: t('name'), description: t('summary') };
}

export default async function PrayerPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('qibla');

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <PrayerTimesPanel />

      <section className="mt-14 border-t border-line pt-10">
        <h2 className="mb-6 font-display text-2xl text-ink">{t('heading')}</h2>
        <QiblaPanel />
      </section>
    </div>
  );
}
