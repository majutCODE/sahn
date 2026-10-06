import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ZakatCalculator from '@/components/ZakatCalculator';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'modules.zakat' });
  return { title: t('seoTitle'), description: t('summary') };
}

export default async function ZakatPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('modules.zakat');

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <h1 className="font-display text-3xl text-ink sm:text-4xl">{t('name')}</h1>
      <p className="mt-2 max-w-prose text-sm text-muted">{t('summary')}</p>
      <div className="mt-8">
        <ZakatCalculator />
      </div>
    </div>
  );
}
