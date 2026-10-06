'use client';

import { useEffect } from 'react';

/**
 * The last resort: an error in the root layout itself.
 *
 * This replaces the entire document, so it must render its own html and body,
 * and it cannot use translations or any shared component - if the layout threw,
 * the providers those depend on are exactly what is unavailable. Hence plain
 * English and inline styles, deliberately, rather than by oversight.
 */
export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch('/api/client-error', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: `root layout: ${error.message}`,
        digest: error.digest,
        path: window.location.pathname
      })
    }).catch(() => undefined);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          background: '#10202b',
          color: '#f2ede4',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
          textAlign: 'center',
          padding: '2rem'
        }}
      >
        <svg width="48" height="48" viewBox="0 0 40 40" aria-hidden="true">
          <path
            d="M20 1 L23.1 13.3 L34 6.9 L27.6 17.8 L39 20 L27.6 22.2 L34 33.1 L23.1 26.7 L20 39 L16.9 26.7 L6 33.1 L12.4 22.2 L1 20 L12.4 17.8 L6 6.9 L16.9 13.3 Z"
            fill="#1f6f6b"
          />
        </svg>
        <h1 style={{ fontWeight: 500, fontSize: '1.4rem', margin: 0 }}>
          Something went wrong
        </h1>
        <p style={{ color: '#9aabb4', maxWidth: '24rem', lineHeight: 1.5 }}>
          Sahn could not load. This has been reported.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: '0.5rem',
            padding: '0.7rem 1.4rem',
            background: '#1f6f6b',
            color: '#fff',
            border: 0,
            fontSize: '0.95rem'
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
