import { NextResponse } from 'next/server';

/**
 * Android App Links.
 *
 * Play signs the app with its own key, so the fingerprint here is the one from
 * Play Console (App integrity, App signing), not a local debug keystore. Until
 * it is set this serves an empty array, which Android reads as no app claiming
 * these links.
 */
export const dynamic = 'force-static';

export function GET() {
  const fingerprint = process.env.ANDROID_CERT_FINGERPRINT;

  return NextResponse.json(
    fingerprint
      ? [
          {
            relation: ['delegate_permission/common.handle_all_urls'],
            target: {
              namespace: 'android_app',
              package_name: 'com.sahnai.app',
              sha256_cert_fingerprints: [fingerprint]
            }
          }
        ]
      : [],
    { headers: { 'content-type': 'application/json' } }
  );
}
