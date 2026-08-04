import type { MetadataRoute } from 'next';
import { defaultLocale } from '@/i18n/routing';

/**
 * Web app manifest - what a phone reads when someone installs Sahn.
 *
 * `start_url` carries a locale because the app opens straight into it: an
 * installed app that bounces through a locale redirect on every cold start
 * shows a blank frame first, which reads as a slow app rather than a redirect.
 *
 * Not localised per install. The manifest is fetched once at install time and
 * a single one keeps the install prompt from depending on which page happened
 * to be open; the app itself still switches language normally.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sahn',
    short_name: 'Sahn',
    description:
      'Prayer times, the Qur’an, and an assistant that answers questions of Islamic law only from cited sources.',
    start_url: `/${defaultLocale}`,
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    // Matches the stone background so the splash does not flash white before
    // the first paint.
    background_color: '#f2ede4',
    theme_color: '#1f6f6b',
    categories: ['lifestyle', 'education', 'books'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml'
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png'
      },
      {
        // Maskable so Android can crop it to whatever shape the launcher uses
        // without slicing the girih star.
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
    shortcuts: [
      {
        name: 'Prayer times',
        url: `/${defaultLocale}/prayer`
      },
      {
        name: 'Qur’an',
        url: `/${defaultLocale}/quran`
      }
    ]
  };
}
