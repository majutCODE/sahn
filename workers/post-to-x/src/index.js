/**
 * The X bot, as a Cloudflare Worker.
 *
 * This replaces a GitHub Actions schedule, for one reason: GitHub disables a
 * scheduled workflow after 60 days of repository inactivity. Sahn's pool holds
 * eight to eleven months of posts, so the schedule was guaranteed to outlive
 * the repo's commit activity and stop without saying anything. Driving it from
 * outside GitHub would have worked too, but every version of that needs a
 * GitHub token with Actions write, and a token is a thing that expires. The
 * companion NBA bot is about to find that out.
 *
 * So nothing here touches GitHub. The only credentials are the four X OAuth 1.0a
 * values, and those do not expire — they are valid until revoked. There is
 * nothing in this design with a date on it.
 *
 * The two failure modes left are both covered:
 *
 *   X refuses the post. Emailed, not logged. The reason the NBA bot can die
 *   quietly is a console.error inside waitUntil, which goes to a log nobody
 *   opens. An unattended bot needs to be able to reach you.
 *
 *   The pool runs out. It does not — the sequence wraps, so after about nine
 *   months it begins again. Each line reappearing once every nine months is
 *   not something a reader can notice.
 */

import pool from '../../../content/social-posts.json';
import { compose, oauthHeader, planFor } from '../../../scripts/lib/social-schedule.mjs';

/** Web Crypto's HMAC-SHA1, shaped the way the shared signer expects. */
async function hmac(key, data) {
  const k = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

const nonce = () =>
  [...crypto.getRandomValues(new Uint8Array(16))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

/**
 * Tells the operator something broke.
 *
 * Deliberately not fatal: if Resend is down or the key is wrong, that must not
 * turn a failed post into an unhandled rejection. Best effort, and the console
 * still has it either way.
 */
async function alert(env, subject, detail) {
  console.error(subject, detail);
  if (!env.RESEND_API_KEY || !env.ALERT_EMAIL) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Sahn <noreply@sahn-ai.com>',
        to: env.ALERT_EMAIL,
        subject: `Sahn X bot: ${subject}`,
        text: `${detail}\n\nThe bot runs hourly and most hours do nothing, so a\nfailure here means a post was due and did not go out.`
      })
    });
  } catch (error) {
    console.error('alert failed', error instanceof Error ? error.message : String(error));
  }
}

export async function post(env, now = new Date()) {
  const slot = planFor(now, pool.posts).find((s) => s.hour === now.getUTCHours());
  if (!slot) return { posted: false, reason: 'no slot this hour' };

  const creds = {
    key: env.X_API_KEY,
    secret: env.X_API_SECRET,
    token: env.X_ACCESS_TOKEN,
    tokenSecret: env.X_ACCESS_SECRET
  };
  if (Object.values(creds).some((v) => !v)) {
    await alert(env, 'missing credentials', 'One of the four X secrets is not set on the Worker.');
    return { posted: false, reason: 'missing credentials' };
  }

  const text = compose(slot, pool.link);
  const url = 'https://api.x.com/2/tweets';
  const authorization = await oauthHeader({
    method: 'POST',
    url,
    creds,
    nonce: nonce(),
    timestamp: Math.floor(now.getTime() / 1000).toString(),
    hmac
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { authorization, 'content-type': 'application/json' },
    body: JSON.stringify({ text })
  });
  const body = await response.text();

  // A retried or duplicated invocation can replay the same slot. X rejects an
  // identical post, which is the behaviour we want, so it is not a failure.
  if (response.status === 403 && body.includes('duplicate')) {
    return { posted: false, reason: 'already posted' };
  }

  if (!response.ok) {
    await alert(
      env,
      `X refused the post (${response.status})`,
      `${body.slice(0, 600)}\n\nThe post was:\n${text}`
    );
    return { posted: false, reason: `http ${response.status}` };
  }

  console.log(`posted (${slot.post.lang}, ${slot.post.keyword})`);
  return { posted: true, text };
}

export default {
  async scheduled(event, env, ctx) {
    // Awaited inside waitUntil rather than fired and forgotten, so the runtime
    // keeps the invocation alive until the post and any alert have finished.
    ctx.waitUntil(post(env));
  },

  /**
   * Manual trigger, so the credentials can be proven without waiting for a
   * slot. Requires a shared secret, because an open endpoint that posts to a
   * public timeline is an open endpoint that posts to a public timeline.
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!env.TRIGGER_SECRET || url.searchParams.get('key') !== env.TRIGGER_SECRET) {
      return new Response('not found', { status: 404 });
    }
    const now = url.searchParams.get('at') ? new Date(url.searchParams.get('at')) : new Date();
    const dry = url.searchParams.get('dry') === '1';
    if (dry) {
      const slot = planFor(now, pool.posts).find((s) => s.hour === now.getUTCHours());
      return Response.json(slot ? { would: compose(slot, pool.link) } : { would: null });
    }
    return Response.json(await post(env, now));
  }
};
