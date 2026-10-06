import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import HijriCalendar from '@/components/HijriCalendar';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'modules.calendar' });
  return { title: t('seoTitle'), description: t('summary') };
}

export default async function CalendarPage({
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
        {t('modules.calendar.name')}
      </h1>
      <p className="mt-3 mb-8 max-w-prose text-base text-muted">
        {t('modules.calendar.summary')}
      </p>
      <HijriCalendar />
    </div>
  );
}
