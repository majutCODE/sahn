import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The matcher decides which paths get a locale prefix. Getting it wrong is
 * quiet: /auth/callback was being rewritten to /en/auth/callback, which does
 * not exist, so every emailed sign-in link landed on the not-found page.
 *
 * The regex is read from the source rather than imported, because importing
 * the middleware pulls in the whole next-intl runtime for a string test.
 */
function matcher(): RegExp {
  const source = readFileSync(new URL('../src/middleware.ts', import.meta.url), 'utf8');
  const line = /matcher: \[\s*'([^']+)'/.exec(source);
  if (!line) throw new Error('matcher not found in middleware.ts');
  return new RegExp(`^${line[1]}$`);
}

describe('middleware matcher', () => {
  const re = matcher();

  it('leaves the auth callback alone', () => {
    // A route handler outside [locale]; prefixing it 404s the sign-in link.
    expect(re.test('/auth/callback')).toBe(false);
  });

  it('leaves the API alone', () => {
    expect(re.test('/api/chat')).toBe(false);
  });

  it('still handles pages', () => {
    expect(re.test('/')).toBe(true);
    expect(re.test('/en')).toBe(true);
    expect(re.test('/ar/prayer')).toBe(true);
  });

  it('still skips Next internals and metadata routes', () => {
    for (const path of ['/_next/static/x.js', '/sitemap.xml', '/robots', '/icon']) {
      expect(re.test(path)).toBe(false);
    }
  });
});
