import 'server-only';

/**
 * Quran.com content API client.
 *
 * `server-only` makes importing this from a client component a build error, so
 * the client secret cannot reach the browser bundle by accident.
 *
 * Auth is OAuth2 client_credentials with scope "content". Tokens last an hour
 * and there is no refresh token, so one is cached in module memory and renewed
 * a minute early.
 */

type Token = { value: string; expiresAt: number };

let cached: Token | null = null;
let inFlight: Promise<Token> | null = null;

function config() {
  const oauthUrl = process.env.QURAN_OAUTH_URL;
  const apiBase = process.env.QURAN_API_BASE;
  const clientId = process.env.QURAN_CLIENT_ID;
  const clientSecret = process.env.QURAN_CLIENT_SECRET;

  if (!oauthUrl || !apiBase || !clientId || !clientSecret) {
    throw new Error(
      'Quran API is not configured. Set QURAN_OAUTH_URL, QURAN_API_BASE, QURAN_CLIENT_ID and QURAN_CLIENT_SECRET.'
    );
  }

  return { oauthUrl, apiBase, clientId, clientSecret };
}

async function requestToken(): Promise<Token> {
  const { oauthUrl, clientId, clientSecret } = config();

  const response = await fetch(oauthUrl, {
    method: 'POST',
    headers: {
      // Credentials go in the Basic header, not the body — the token endpoint
      // rejects them as form fields.
      authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials&scope=content',
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Quran token request failed: ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };

  return {
    value: data.access_token,
    // A minute of headroom so a request never starts with a token that expires
    // mid-flight.
    expiresAt: Date.now() + (data.expires_in - 60) * 1000
  };
}

async function getToken(): Promise<Token> {
  if (cached && cached.expiresAt > Date.now()) return cached;

  // Collapse concurrent renewals: on a cold start every request would
  // otherwise mint its own token.
  inFlight ??= requestToken()
    .then((token) => {
      cached = token;
      return token;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export type QuranFetchOptions = {
  params?: Record<string, string | number | undefined>;
  /** Seconds to cache. Scripture does not change; defaults to a day. */
  revalidate?: number;
};

export async function quranFetch<T>(
  path: string,
  { params, revalidate = 86_400 }: QuranFetchOptions = {}
): Promise<T> {
  const { apiBase, clientId } = config();

  const url = new URL(`/content/api/v4/${path.replace(/^\//, '')}`, apiBase);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const call = async (token: string) =>
    fetch(url, {
      headers: { 'x-auth-token': token, 'x-client-id': clientId },
      next: { revalidate }
    });

  let token = await getToken();
  let response = await call(token.value);

  // A cached token can still be rejected — the service may have revoked it.
  // Drop it and try once more before giving up.
  if (response.status === 401) {
    cached = null;
    token = await getToken();
    response = await call(token.value);
  }

  if (!response.ok) {
    throw new Error(`Quran API ${url.pathname} failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

/** Exposed for tests and scripts; not part of the normal path. */
export function resetTokenCache(): void {
  cached = null;
  inFlight = null;
}
