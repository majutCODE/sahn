import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import FinanceDisclaimer from '@/components/FinanceDisclaimer';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { TOPICS } from '@/lib/finance/topics';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'modules.finance' });
  return { title: t('seoTitle'), description: t('summary') };
}

export default async function FinancePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('finance');
  const lang = locale as Locale;

  const regions = ['all', 'gb', 'gulf'] as const;

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <h1 className="font-display text-3xl text-ink sm:text-4xl">{t('heading')}</h1>
      <p className="mt-2 max-w-prose text-sm text-muted">{t('intro')}</p>

      <div className="mt-6">
        <FinanceDisclaimer />
      </div>

      {regions.map((region) => {
        const topics = TOPICS.filter((topic) => topic.region === region);
        if (topics.length === 0) return null;
        return (
          <section key={region} className="mt-10">
            <h2 className="font-display text-xl text-ink">
              {t(`regions.${region}`)}
            </h2>
            <ul className="mt-3 border-t border-line">
              {topics.map((topic) => (
                <li key={topic.slug} className="border-b border-line">
                  <Link
                    href={`/finance/${topic.slug}`}
                    className="block py-4 transition-colors hover:bg-sunk"
                  >
                    <span className="block text-ink">{topic.title[lang]}</span>
                    <span className="mt-1 block text-sm text-muted">
                      {topic.summary[lang]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <section className="mt-12 border-t border-line pt-6">
        <h2 className="font-display text-lg text-ink">{t('sourcesHeading')}</h2>
        <p className="mt-2 max-w-prose text-xs text-muted">{t('sourcesNote')}</p>
        <ul className="mt-3 space-y-1.5 text-sm">
          <li>
            <a
              href="https://aaoifi.com/shariaa-standards/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-glaze underline underline-offset-2"
            >
              {t('aaoifi')}
            </a>
          </li>
          <li>
            <a
              href="https://www.fca.org.uk/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-glaze underline underline-offset-2"
            >
              {t('fca')}
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
