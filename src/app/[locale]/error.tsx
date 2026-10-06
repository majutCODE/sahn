'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

/**
 * What a reader sees when a page fails to render.
 *
 * Without this, Next shows its own bare screen - in production, "Application
 * error: a client-side exception has occurred" on a white page with no way
 * forward but the back button. That is exactly what a service worker bug
 * produced for every returning visitor, and the first I knew of it was being
 * told.
 *
 * So it does two things: gives the reader a way out, and tells us. The server
 * already reports its own faults; this closes the half that was silent.
 */
export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errorPage');

  useEffect(() => {
    void fetch('/api/client-error', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        path: window.location.pathname
      })
    }).catch(() => {
      // If the network is the problem, there is nowhere to report it to.
    });
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col justify-center px-5 py-16 sm:px-8">
      <h1 className="font-display text-2xl text-ink">{t('heading')}</h1>
      <p className="mt-3 text-sm text-muted">{t('body')}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="border border-glaze bg-glaze px-4 py-2.5 text-sm text-on-glaze transition-colors hover:bg-transparent hover:text-glaze"
        >
          {t('retry')}
        </button>
        {/* A hard navigation on purpose, not an oversight. The React tree
            here is already broken; a client-side route change preserves the
            state that broke it, while a fresh document does not. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className="border border-line px-4 py-2.5 text-sm text-ink hover:border-glaze"
        >
          {t('home')}
        </a>
      </div>

      {error.digest && (
        <p className="mt-6 text-xs text-muted" dir="ltr">
          {t('reference', { digest: error.digest })}
        </p>
      )}
    </div>
  );
}
