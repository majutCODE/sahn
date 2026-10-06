import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import GirihDoorway from '@/components/GirihDoorway';
import RamadanPlanner from '@/components/RamadanPlanner';
import { getModule } from '@/lib/modules';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'modules.ramadan' });
  return { title: t('seoTitle'), description: t('summary') };
}

export default async function RamadanPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <GirihDoorway
        variant={getModule('ramadan').girih}
        size={40}
        className="text-glaze"
      />
      <h1 className="mt-5 font-display text-3xl text-ink sm:text-4xl">
        {t('modules.ramadan.name')}
      </h1>
      <p className="mt-3 max-w-prose text-base text-muted">
        {t('modules.ramadan.summary')}
      </p>
      <RamadanPlanner />
    </div>
  );
}
