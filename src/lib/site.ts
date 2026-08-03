import { locales } from '@/i18n/routing';

/**
 * The canonical origin, in one place.
 *
 * Order matters. `NEXT_PUBLIC_SITE_URL` is the deliberate answer and wins.
 * `VERCEL_URL` covers preview deployments, where the host is generated per
 * branch — without it every preview would advertise the production domain and
 * its OG images would resolve to the wrong build. Localhost is the dev
 * fallback.
 */
export const PRODUCTION_ORIGIN = 'https://sahn-ai.com';

export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return 'http://localhost:3000';
}

/** Absolute URL for a locale-prefixed path. */
export function absolute(path = '/'): string {
  return new URL(path, `${siteUrl()}/`).toString();
}

/**
 * Only the production host should be indexed. Preview deployments and
 * localhost carry the same content, and letting a search engine index a
 * preview splits ranking across hosts that disappear.
 */
export function isIndexable(): boolean {
  return siteUrl() === PRODUCTION_ORIGIN;
}

export { locales };
