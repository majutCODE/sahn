import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import JsonLd from '@/components/JsonLd';
import ZakatCalculator from '@/components/ZakatCalculator';
import type { Locale } from '@/i18n/routing';
import { ZAKAT_FAQ, ZAKAT_GUIDE } from '@/lib/zakat-guide';

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
  const tg = await getTranslations('zakat');
  const lang = locale as Locale;

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <h1 className="font-display text-3xl text-ink sm:text-4xl">{t('name')}</h1>
      <p className="mt-2 max-w-prose text-sm text-muted">{t('summary')}</p>
      <div className="mt-8">
        <ZakatCalculator />
      </div>

      {/* Below the tool, not above it: someone arriving to calculate should
          reach the calculator first, and someone arriving from a search for
          "what is the nisab" gets the answer without it being the first thing
          in the way. */}
      <div className="mt-14 border-t border-line pt-10">
        <h2 className="font-display text-2xl text-ink">{tg('guideHeading')}</h2>
        {ZAKAT_GUIDE.map((section) => (
          <section key={section.heading.en} className="mt-8">
            <h3 className="font-display text-lg text-ink">
              {section.heading[lang]}
            </h3>
            {section.body[lang].split('\n\n').map((paragraph, i) => (
              <p key={i} className="mt-3 max-w-prose text-sm leading-relaxed text-ink">
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        <h2 className="mt-12 font-display text-2xl text-ink">{tg('faqHeading')}</h2>
        <dl className="mt-3 border-t border-line">
          {ZAKAT_FAQ.map((item) => (
            <div key={item.heading.en} className="border-b border-line py-4">
              <dt className="text-ink">{item.heading[lang]}</dt>
              <dd className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted">
                {item.body[lang]}
              </dd>
            </div>
          ))}
        </dl>

        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: ZAKAT_FAQ.map((item) => ({
              '@type': 'Question',
              name: item.heading[lang],
              acceptedAnswer: { '@type': 'Answer', text: item.body[lang] }
            }))
          }}
        />
      </div>
    </div>
  );
}
