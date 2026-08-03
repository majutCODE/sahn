import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { defaultLocale } from '@/i18n/routing';

/**
 * Exchanges the email-link code for a session, then returns the user to the
 * locale they signed in from. `next` is validated as a same-origin path so the
 * parameter cannot be used as an open redirect.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const requested = searchParams.get('next') ?? `/${defaultLocale}`;
  const next = requested.startsWith('/') && !requested.startsWith('//')
    ? requested
    : `/${defaultLocale}`;

  if (!code) {
    return NextResponse.redirect(`${origin}/${defaultLocale}/sign-in?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/${defaultLocale}/sign-in?error=exchange`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
