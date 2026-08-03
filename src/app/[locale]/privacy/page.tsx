import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import LegalPage from '@/components/LegalPage';
import type { Locale } from '@/i18n/routing';
import { PRIVACY } from '@/lib/legal';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: PRIVACY.title[locale as Locale] };
}

export default async function Page({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('legal');
  return (
    <LegalPage
      doc={PRIVACY}
      locale={locale as Locale}
      updatedLabel={t('updated')}
    />
  );
}
