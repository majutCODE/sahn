import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import FinanceDisclaimer from '@/components/FinanceDisclaimer';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { TOPICS, getTopic } from '@/lib/finance/topics';

type Params = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return TOPICS.map((topic) => ({ slug: topic.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const topic = getTopic(slug);
  if (!topic) return {};
  return { title: topic.title[locale as Locale], description: topic.summary[locale as Locale] };
}

export default async function TopicPage({ params }: Params) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const topic = getTopic(slug);
  if (!topic) notFound();

  const t = await getTranslations('finance');
  const lang = locale as Locale;

  return (
    <article className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <Link href="/finance" className="text-sm text-glaze underline underline-offset-2">
        {t('backToGuide')}
      </Link>

      <h1 className="mt-4 font-display text-3xl text-ink sm:text-4xl">
        {topic.title[lang]}
      </h1>
      <p className="mt-2 max-w-prose text-sm text-muted">{topic.summary[lang]}</p>

      <div className="mt-6">
        <FinanceDisclaimer />
      </div>

      {topic.sections.map((section) => (
        <section key={section.heading.en} className="mt-10">
          <h2 className="font-display text-xl text-ink">{section.heading[lang]}</h2>
          {section.body[lang].split('\n\n').map((paragraph, i) => (
            <p key={i} className="mt-3 max-w-prose text-base leading-relaxed text-ink">
              {paragraph}
            </p>
          ))}
        </section>
      ))}

      <div className="mt-12 border-t border-line pt-6">
        <FinanceDisclaimer />
      </div>
    </article>
  );
}
