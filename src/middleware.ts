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
  // The metadata routes are listed explicitly: they have no file extension, so
  // the `.*\..*` escape does not catch them and they would be locale-redirected
  // into a 307 — which link-preview crawlers do not follow.
  matcher: [
    '/((?!api|_next|_vercel|opengraph-image|twitter-image|apple-icon|icon|manifest|robots|sitemap|.*\\..*).*)'
  ]
};
