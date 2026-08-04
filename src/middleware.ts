import createIntlMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { updateSession } from '@/lib/supabase/middleware';

const handleI18n = createIntlMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const response = handleI18n(request);
  return updateSession(request, response);
}

export const config = {
  // Everything except Next internals, the API surface and static assets.
  //
  // `auth` is excluded because /auth/callback is a route handler that lives
  // outside [locale]. Locale-prefixing it produced /en/auth/callback, which
  // does not exist, so every emailed sign-in link landed on the not-found
  // page. It went unnoticed while the links carried a PKCE `code`, because
  // the browser client picked the code out of the URL and created the session
  // even as the page 404'd — the session appeared, the page looked broken,
  // and the two were the same bug.
  //
  // The metadata routes are listed explicitly: they have no file extension, so
  // the `.*\..*` escape does not catch them and they would be locale-redirected
  // into a 307 — which link-preview crawlers do not follow.
  matcher: [
    '/((?!api|auth|_next|_vercel|opengraph-image|twitter-image|apple-icon|icon|manifest|robots|sitemap|.*\\..*).*)'
  ]
};
