import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, routing, type Locale } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = hasLocale(routing.locales, requested)
    ? requested
    : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    // A missing string is a bug, not a fallback. Fail loudly in development so
    // it never reaches a screen; degrade to the key path in production.
    getMessageFallback({ key, namespace }) {
      const path = [namespace, key].filter(Boolean).join('.');
      if (process.env.NODE_ENV === 'development') {
        throw new Error(`Missing message "${path}" for locale "${locale}"`);
      }
      return path;
    }
  };
});
