import { createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';

/**
 * Refreshes the Supabase auth session on an existing response.
 *
 * The response is produced by the next-intl middleware first, so cookies are
 * written onto that same object rather than a new one — otherwise the locale
 * rewrite and the session cookies would fight over the response.
 *
 * No-ops when Supabase env vars are absent so the shell runs before a project
 * is provisioned.
 */
export async function updateSession(
  request: NextRequest,
  response: NextResponse
): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  // Touching getUser() is what triggers the refresh. Do not remove.
  await supabase.auth.getUser();

  return response;
}
