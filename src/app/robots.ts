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
    sitemap: `${siteUrl()}/sitemap.xml`
  };
}
