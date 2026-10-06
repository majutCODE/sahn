import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import VerseSearch from '@/components/VerseSearch';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'modules.search' });
  return { title: t('seoTitle'), description: t('summary') };
}

export default async function SearchPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('verseSearch');

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <h1 className="font-display text-3xl text-ink sm:text-4xl">{t('heading')}</h1>
      <p className="mt-2 max-w-prose text-sm text-muted">{t('intro')}</p>
      <div className="mt-8">
        <VerseSearch />
      </div>
    </div>
  );
}
