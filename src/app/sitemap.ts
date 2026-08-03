import type { MetadataRoute } from 'next';
import { locales } from '@/i18n/routing';
import { modules } from '@/lib/modules';
import { TOPICS } from '@/lib/finance/topics';
import { LEGAL_DOCUMENTS } from '@/lib/legal';
import { siteUrl } from '@/lib/site';

/**
 * Public pages only. Saved conversations (/c/…) and the API are excluded —
 * they are per-user and behind auth.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteUrl();
  const paths = [
    '',
    ...modules.map((m) => m.href),
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
