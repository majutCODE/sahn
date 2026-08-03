import { defineRouting } from 'next-intl/routing';

export const locales = ['en', 'ar'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

/** Text direction per locale. The single source of truth for `dir`. */
export const localeDirection: Record<Locale, 'ltr' | 'rtl'> = {
  en: 'ltr',
  ar: 'rtl'
};

/**
 * BCP-47 tag used for Intl formatting. `ar-EG-u-nu-arab` forces Eastern
 * Arabic digits (٠١٢٣) rather than relying on the default numbering system.
 */
export const localeFormatTag: Record<Locale, string> = {
  en: 'en-GB',
  ar: 'ar-EG-u-nu-arab'
};

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'always'
});
