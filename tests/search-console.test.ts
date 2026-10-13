import { createVerify, generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { assertion, loadKey } from '../scripts/lib/search-console.mjs';

/**
 * The assertion is signed locally and sent once. If it is malformed, Google
 * returns "invalid_grant", which says nothing about which field was wrong, so
 * the shape is checked here instead.
 */
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const key = {
  client_email: 'sahn@example.iam.gserviceaccount.com',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) as string
};

const decode = (segment: string) =>
  JSON.parse(Buffer.from(segment.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());

describe('search console assertion', () => {
  it('claims the read-only scope and nothing more', () => {
    const claims = decode(assertion(key, 1_700_000_000).split('.')[1]);
    expect(claims.scope).toBe('https://www.googleapis.com/auth/webmasters.readonly');
    expect(claims.iss).toBe(key.client_email);
    expect(claims.aud).toBe('https://oauth2.googleapis.com/token');
  });

  it('expires in an hour, which is the most Google allows', () => {
    const claims = decode(assertion(key, 1_700_000_000).split('.')[1]);
    expect(claims.iat).toBe(1_700_000_000);
    expect(claims.exp - claims.iat).toBe(3600);
  });

  it('is base64url, not base64', () => {
    // + / and = in a JWT are rejected, and whether they appear depends on the
    // bytes, so one signature passing proves nothing. Many do.
    for (let i = 0; i < 25; i += 1) {
      expect(assertion(key, 1_700_000_000 + i)).not.toMatch(/[+/=]/);
    }
  });

  it('signs something the public key actually verifies', () => {
    const token = assertion(key, 1_700_000_000);
    const [header, claims, signature] = token.split('.');
    const ok = createVerify('RSA-SHA256')
      .update(`${header}.${claims}`)
      .verify(
        publicKey,
        Buffer.from(signature.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
      );
    expect(ok).toBe(true);
  });
});

describe('key loading', () => {
  it('accepts the json base64 encoded, since a dotenv cannot hold newlines', () => {
    const json = JSON.stringify({ client_email: 'a@b.c', private_key: 'x' });
    const encoded = Buffer.from(json).toString('base64');
    expect(loadKey({ SEARCH_CONSOLE_KEY: encoded })).toEqual(JSON.parse(json));
  });

  it('accepts raw json too', () => {
    const json = JSON.stringify({ client_email: 'a@b.c', private_key: 'x' });
    expect(loadKey({ SEARCH_CONSOLE_KEY: json })).toEqual(JSON.parse(json));
  });

  it('says what to do when it is absent rather than throwing a type error', () => {
    expect(() => loadKey({})).toThrow(/SEARCH_CONSOLE_KEY/);
  });
});
