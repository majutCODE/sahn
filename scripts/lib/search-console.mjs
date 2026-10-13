/**
 * Google Search Console, as a service account.
 *
 * Service account rather than OAuth deliberately: an OAuth refresh token is a
 * thing that expires, gets revoked when a password changes, and needs a browser
 * to renew. A service account key does none of that, so this keeps working
 * without anyone coming back to it - the same reason the X bot holds no GitHub
 * token.
 *
 * Read-only scope. This reads rankings; it has no business writing anything.
 */

import { createSign } from 'node:crypto';

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

/** base64url, which is base64 with three substitutions and no padding. */
const b64url = (input) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/**
 * Builds and signs the assertion Google exchanges for an access token.
 *
 * `now` is a parameter so a test can assert the claim set without the clock
 * moving underneath it.
 */
export function assertion(key, now = Math.floor(Date.now() / 1000)) {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({
      iss: key.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      // An hour is the maximum Google accepts, and the token is used
      // immediately, so there is nothing to gain from asking for less.
      exp: now + 3600,
      iat: now
    })
  );
  const body = `${header}.${claims}`;
  const signature = createSign('RSA-SHA256').update(body).sign(key.private_key);
  return `${body}.${b64url(signature)}`;
}

export async function accessToken(key) {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: assertion(key)
    })
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(
      `Google refused the key: ${body.error ?? response.status}` +
        (body.error_description ? ` - ${body.error_description}` : '')
    );
  }
  return body.access_token;
}

/**
 * One searchAnalytics query.
 *
 * `property` is the Search Console property exactly as it appears there. A
 * domain property is "sc-domain:example.com"; a URL-prefix property is the URL
 * with its trailing slash. Getting this wrong returns 403, not 404, which
 * reads as a permissions problem and usually is not.
 */
export async function query(token, property, body) {
  const url =
    'https://searchconsole.googleapis.com/webmasters/v3/sites/' +
    encodeURIComponent(property) +
    '/searchAnalytics/query';

  const response = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await response.json();
  if (!response.ok) {
    const message = json.error?.message ?? `HTTP ${response.status}`;
    throw new Error(
      response.status === 403
        ? `${message}\n\nThe service account is probably not a user on the property. ` +
          `Add its email in Search Console under Settings, Users and permissions.`
        : message
    );
  }
  return json.rows ?? [];
}

/**
 * Reads the key from whichever of the two places it was put.
 *
 * The JSON is multi-line, which a .env file cannot hold, so it is accepted
 * base64-encoded as well as by path.
 */
export function loadKey(env = process.env) {
  const inline = env.SEARCH_CONSOLE_KEY;
  if (inline) {
    const text = inline.trim().startsWith('{')
      ? inline
      : Buffer.from(inline, 'base64').toString('utf8');
    return JSON.parse(text);
  }
  throw new Error(
    'No SEARCH_CONSOLE_KEY. Put the service account JSON in .env.local as\n' +
      '  SEARCH_CONSOLE_KEY=<the json, base64 encoded>'
  );
}

export const PROPERTY = 'sc-domain:sahn-ai.com';
