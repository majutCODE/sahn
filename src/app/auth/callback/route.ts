import { NextResponse, type NextRequest } from 'next/server';
import { reportError } from '@/lib/observability/report';
import { createClient } from '@/lib/supabase/server';
import { defaultLocale, locales } from '@/i18n/routing';

/**
 * Turns an email link into a session, then returns the user to the locale they
 * signed in from.
 *
 * Supabase sends one of two link shapes depending on the email template: a
 * PKCE `code`, or a `token_hash` with a `type`. Handling only `code` meant a
 * token_hash link fell through to "missing_code" and read as a bug in the app
 * rather than as a refused link. Both are accepted.
 *
 * `next` is validated as a same-origin path, so the parameter cannot be turned
 * into an open redirect by anyone who reshapes the link.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const requested = searchParams.get('next') ?? `/${defaultLocale}`;
  const next =
    requested.startsWith('/') && !requested.startsWith('//')
      ? requested
      : `/${defaultLocale}`;

  // Report failures in the locale the user started in, not always English.
  const segment = next.split('/')[1];
  const locale = (locales as readonly string[]).includes(segment)
    ? segment
    : defaultLocale;
  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/${locale}/sign-in?error=${reason}`);

  // A refused link is reported in the query string rather than by failing the
  // exchange: an expired one arrives here looking like a success, with no code
  // at all. Without this it was indistinguishable from a malformed link.
  const denied = searchParams.get('error_code') ?? searchParams.get('error');
  if (denied) return fail(denied.includes('expired') ? 'expired' : 'denied');

  const supabase = await createClient();
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // Sign-in breaking is silent by nature: the person gives up and never
      // says anything. It is the last failure that should go unreported.
      void reportError('auth', error, 'exchanging a PKCE code');
      return fail('exchange');
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as 'magiclink' | 'email' | 'signup' | 'recovery' | 'invite',
      token_hash: tokenHash
    });
    if (error) {
      void reportError('auth', error, 'verifying an emailed token');
      return fail('exchange');
    }
  } else {
    void reportError(
      'auth',
      new Error('callback reached with neither code nor token_hash'),
      'the email template may be sending a link this route cannot consume'
    );
    return fail('missing_code');
  }

  return NextResponse.redirect(`${origin}${next}`);
}
