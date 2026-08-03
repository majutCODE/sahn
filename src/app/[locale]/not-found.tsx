import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { localeDirection, type Locale } from '@/i18n/routing';

/**
 * Next renders not-found through its own document shell, so the `lang` and
 * `dir` set in the locale layout do not reach it. Both are repeated on the
 * container here — that also re-triggers the `[lang='ar']` font rules, which
 * cascade from the attribute rather than from the root element.
 */
export default function NotFound() {
  const t = useTranslations('notFound');
  const locale = useLocale() as Locale;

  return (
    <section
      lang={locale}
      dir={localeDirection[locale]}
      className="mx-auto min-h-dvh max-w-xl bg-surface px-5 py-16 font-sans text-ink sm:px-8"
    >
      <h1 className="font-display text-3xl text-ink">{t('title')}</h1>
      <p className="mt-3 text-base text-muted">{t('body')}</p>
      <Link
        href="/"
        className="mt-6 inline-block border border-glaze px-4 py-2 text-sm text-glaze transition-colors hover:bg-glaze hover:text-on-glaze"
      >
        {t('back')}
      </Link>
    </section>
  );
}
