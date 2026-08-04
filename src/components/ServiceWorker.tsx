'use client';

import { useEffect } from 'react';
import { PRODUCTION_ORIGIN } from '@/lib/site';

/**
 * Registers the service worker.
 *
 * Production only, and not merely to avoid noise: a worker registered against
 * localhost outlives the dev session and will serve a stale shell over the
 * next branch you work on, which is a genuinely confusing hour to lose.
 *
 * Registration waits for load. Competing with the first paint for bandwidth
 * makes the first visit slower in exchange for making the second one faster,
 * which is the wrong trade for someone arriving from a search result.
 */
export default function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (window.location.origin !== PRODUCTION_ORIGIN) return;

    const register = () => {
      void navigator.serviceWorker.register('/sw.js').catch(() => {
        // An unregistered worker costs the offline tools, nothing else.
      });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });

    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
