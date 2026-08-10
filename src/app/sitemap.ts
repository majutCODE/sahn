import type { MetadataRoute } from 'next';
import { locales } from '@/i18n/routing';
import { modules } from '@/lib/modules';
import { TOPICS } from '@/lib/finance/topics';
import { LEGAL_DOCUMENTS } from '@/lib/legal';
import { siteUrl } from '@/lib/site';
import {
  hasArabicPage,
  shippedCities,
  shippedCountries
} from '@/lib/prayer-pages/cities';

/**
 * Sharded by content type, not by size.
 *
 * The 50,000-URL limit is nowhere near binding. The reason to split is
 * diagnostic: Search Console reports coverage per sitemap, so separating the
 * clusters answers "are the city pages indexing" directly. One blended file
 * gives a single number and no way to tell which part of the site Google is
 * ignoring.
 */
export async function generateSitemaps() {
  return [{ id: 'static' }, { id: 'prayer-countries' }, { id: 'prayer-cities' }];
}

export default function sitemap({
  id
}: {
  id: string;
}): MetadataRoute.Sitemap {
  if (id === 'prayer-cities') {
    return shippedCities().flatMap((city) =>
      locales
        // No entry for a page that is not built. A sitemap listing a 404 is
        // worse than a sitemap that is missing it.
        .filter((locale) => locale === 'en' || hasArabicPage(city))
        .map((locale) => ({
          url: `${siteUrl()}/${locale}/prayer/${city.country.toLowerCase()}/${city.slug}`,
          lastModified: new Date(),
          changeFrequency: 'daily' as const,
          priority: 0.7
        }))
    );
  }

  if (id === 'prayer-countries') {
    return shippedCountries().flatMap((country) =>
      locales.map((locale) => ({
        url: `${siteUrl()}/${locale}/prayer/${country.toLowerCase()}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.5
      }))
    );
  }

  return staticPages();
}

/**
 * Public pages only. Saved conversations (/c/…) and the API are excluded —
 * they are per-user and behind auth.
 */
function staticPages(): MetadataRoute.Sitemap {
  const origin = siteUrl();
  const paths = [
    '',
    // Counsel is deliberately absent: the page is noindex, and listing it in
    // the sitemap would contradict that.
    ...modules.filter((m) => m.id !== 'counsel').map((m) => m.href),
    ...TOPICS.map((t) => `/finance/${t.slug}`),
    ...LEGAL_DOCUMENTS.map((d) => `/${d.slug}`),
    // 114 surahs are real, indexable pages and the bulk of the useful surface.
    ...Array.from({ length: 114 }, (_, i) => `/quran/${i + 1}`)
  ];

  return paths.flatMap((path) =>
    locales.map((locale) => ({
      url: `${origin}/${locale}${path}`,
      lastModified: new Date(),
      // Each locale is an alternate of the other, so a crawler indexes both
      // rather than treating one as duplicate content.
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, `${origin}/${l}${path}`])
        )
      }
    }))
  );
}
