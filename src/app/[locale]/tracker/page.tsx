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
  return { title: t('name'), description: t('summary') };
}

export default async function TrackerPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <SalahTracker />
    </div>
  );
}
