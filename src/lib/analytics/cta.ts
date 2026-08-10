import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { after } from 'next/server';

/**
 * Records that a conversation began from a content page.
 *
 * Nothing identifying is stored: not the user, not the IP, not the question.
 * A row says "a conversation began from this page, in this language", which is
 * everything needed to decide whether to build more pages like it and nothing
 * more.
 *
 * Scheduled with after() for the same reason the error reporter is: a route
 * that returns while an unawaited write is in flight is frozen the moment it
 * responds, and the write never lands.
 */
export async function recordCta(source: string, locale: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  const work = async () => {
    try {
      const admin = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      await admin.rpc('record_cta', { p_source: source, p_locale: locale });
    } catch {
      // Measurement must never cost an answer.
    }
  };

  try {
    after(work);
  } catch {
    await work();
  }
}
