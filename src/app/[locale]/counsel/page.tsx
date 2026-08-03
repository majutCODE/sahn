import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import CounselRoom from '@/components/CounselRoom';
import GirihDoorway from '@/components/GirihDoorway';
import { getModule } from '@/lib/modules';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'modules.counsel' });
  // Nothing here should be indexed, and nothing should be summarised into a
  // search result: the page is about what people bring to it.
  return { title: t('name'), description: t('summary'), robots: { index: false } };
}

export default async function CounselPage({
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
        variant={getModule('counsel').girih}
        size={40}
        className="text-glaze"
      />
      <h1 className="mt-5 font-display text-3xl text-ink sm:text-4xl">
        {t('modules.counsel.name')}
      </h1>
      <p className="mt-3 max-w-prose text-base text-muted">
        {t('modules.counsel.summary')}
      </p>
      <CounselRoom />
    </div>
  );
}
