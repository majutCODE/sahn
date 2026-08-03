import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ModulePlaceholder from '@/components/ModulePlaceholder';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'modules.counsel' });
  return { title: t('name'), description: t('summary') };
}

export default async function Page({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ModulePlaceholder id="counsel" />;
}
