import type { MetadataRoute } from 'next';
import { isIndexable, siteUrl } from '@/lib/site';

/**
 * Preview deployments and localhost serve the same content as production.
 * Letting a crawler index them splits ranking across hosts that vanish, so
 * only the canonical origin is allowed.
 */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexable()) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Nothing under these is useful to a crawler, and /c/ is private.
        disallow: ['/api/', '/auth/', '/c/']
      }
    ],
    // One entry per shard. Search Console reports coverage per sitemap, so
    // this is what makes "are the city pages indexing" an answerable question.
    sitemap: [
      `${siteUrl()}/sitemap/static.xml`,
      `${siteUrl()}/sitemap/prayer-countries.xml`,
      `${siteUrl()}/sitemap/prayer-cities.xml`
    ]
  };
}
