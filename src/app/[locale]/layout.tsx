import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Amiri_Quran, Fraunces, IBM_Plex_Sans_Arabic, Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import Analytics from '@/components/Analytics';
import ServiceWorker from '@/components/ServiceWorker';
import CourtyardRail from '@/components/CourtyardRail';
import MobileBar from '@/components/MobileBar';
import { SettingsProvider } from '@/components/SettingsProvider';
import { localeDirection, routing, type Locale } from '@/i18n/routing';
import { siteUrl } from '@/lib/site';
import '../globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-arabic',
  display: 'swap'
});

// Display face: humanist, high-contrast, and not Playfair.
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'WONK']
});

// Quranic text only. Never used for UI.
const amiriQuran = Amiri_Quran({
  subsets: ['arabic'],
  weight: '400',
  variable: '--font-amiri-quran',
  display: 'swap'
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'app' });

  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t('name'), template: `%s · ${t('name')}` },
    description: t('description'),
    alternates: {
      canonical: `${siteUrl()}/${locale}`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `${siteUrl()}/${l}`])
      )
    },
    openGraph: {
      type: 'website',
      url: `${siteUrl()}/${locale}`,
      siteName: t('name'),
      title: t('name'),
      description: t('description'),
      locale: locale === 'ar' ? 'ar_AR' : 'en_GB'
    },
    twitter: {
      card: 'summary_large_image',
      title: t('name'),
      description: t('description')
    },
    manifest: '/manifest.webmanifest',
    appleWebApp: {
      capable: true,
      title: t('name'),
      // The status bar sits over the page, so the header's own background
      // shows through instead of a black bar above it.
      statusBarStyle: 'default'
    }
  };
}

/**
 * Installed-app chrome.
 *
 * `viewportFit: 'cover'` lets the page reach under the notch and the home
 * indicator; without `themeColor` the status bar area renders white above a
 * stone page, which is the single most obvious tell that something is a
 * website in a shell rather than an app.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2ede4' },
    { media: '(prefers-color-scheme: dark)', color: '#10202b' }
  ]
};

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const dir = localeDirection[locale as Locale];
  const t = await getTranslations('nav');

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${inter.variable} ${plexArabic.variable} ${fraunces.variable} ${amiriQuran.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-surface text-ink antialiased">
        <NextIntlClientProvider>
          <SettingsProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-50 focus:bg-glaze focus:px-3 focus:py-2 focus:text-on-glaze"
            >
              {t('skipToContent')}
            </a>
            <div className="flex min-h-dvh">
              <CourtyardRail />
              <div className="flex min-w-0 flex-1 flex-col">
                <MobileBar />
                <main id="main" className="flex flex-1 flex-col">
                  {children}
                </main>
              </div>
            </div>
          </SettingsProvider>
        </NextIntlClientProvider>
        <Analytics />
        <ServiceWorker />
      </body>
    </html>
  );
}
