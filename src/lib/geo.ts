import type { NextRequest } from 'next/server';

/**
 * The caller's country, for choosing crisis resources.
 *
 * Taken from the edge header rather than asked of the client. The regional
 * helpline table existed for a while with nothing populating `country`, so
 * every disclosure — including from the Gulf — was answered with the
 * international directory. A value the client has to remember to send is a
 * value that eventually is not sent.
 *
 * Nothing is stored. The code is read from the request, used to pick a list
 * of phone numbers, and discarded; it never reaches the database and never
 * reaches a model.
 */
export function requestCountry(request: NextRequest): string | undefined {
  const header =
    request.headers.get('x-vercel-ip-country') ??
    // Cloudflare fronts the domain, so this is present in some paths too.
    request.headers.get('cf-ipcountry');

  // ISO 3166-1 alpha-2 only. 'XX' and 'T1' are what the edge returns for an
  // unknown origin or Tor, and both should fall through to the directory.
  if (!header || !/^[A-Za-z]{2}$/.test(header)) return undefined;
  const code = header.toUpperCase();
  return code === 'XX' || code === 'T1' ? undefined : code;
}
