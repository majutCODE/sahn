import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import SalahTracker from '@/components/SalahTracker';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'modules.tracker' });
  return { title: t('seoTitle'), description: t('summary') };
}

export default async function TrackerPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <h1 className="font-display text-3xl text-ink sm:text-4xl">
        {t('modules.tracker.name')}
      </h1>
      <p className="mt-3 mb-8 max-w-prose text-base text-muted">
        {t('modules.tracker.summary')}
      </p>
      <SalahTracker />
    </div>
  );
}
