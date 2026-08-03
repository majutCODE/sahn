import Script from 'next/script';
import { isIndexable } from '@/lib/site';

/**
 * Page-view counting, via Vercel's first-party endpoint.
 *
 * Loaded as a bare script rather than through @vercel/analytics: the package
 * carries optional peer dependencies on the Svelte toolchain that conflict
 * with the Vite version vitest pins, and all it does is inject this tag.
 *
 * What it does and does not do matters here, because the privacy notice makes
 * a promise about it. It sets no cookie, assigns no persistent identifier and
 * follows nobody between sites; it counts requests for pages. Nothing about
 * an individual account is sent to it, and no worship data is visible to it.
 *
 * Production only. Counting developer page loads is noise, and localhost has
 * no such endpoint to load from anyway.
 */
export default function Analytics() {
  if (!isIndexable()) return null;
  return <Script src="/_vercel/insights/script.js" strategy="afterInteractive" />;
}
