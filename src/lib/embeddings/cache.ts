import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { queryHash } from './query-key';
import { EMBEDDING_MODEL, embedOne, toVectorLiteral } from './voyage';

/**
 * Query-embedding cache.
 *
 * Voyage allows 3 requests a minute across the entire site on an account with
 * no payment method, and one question costs one request. Questions repeat
 * heavily — the same handful of fiqh questions arrive over and over — and the
 * same text always embeds to the same vector, so every repeat is a request
 * spent to recompute a known answer.
 *
 * Only a hash is stored, never the question. The cache needs equality, not
 * text, and a log of what people have asked Sahn is not a thing worth keeping.
 */

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

/**
 * The query's vector, from cache when possible.
 *
 * Every cache failure falls through to embedding normally. A cache that can
 * take the site down when it misbehaves is worse than no cache — the only
 * thing a fault here should cost is the saving.
 */
export async function embedQueryCached(query: string): Promise<number[]> {
  const hash = queryHash(query);
  const db = admin();

  if (db) {
    try {
      const { data } = await db
        .from('query_embeddings')
        .select('embedding')
        .eq('query_hash', hash)
        .eq('model', EMBEDDING_MODEL)
        .maybeSingle();

      if (data?.embedding) {
        // pgvector comes back as its text literal, not an array.
        const vector = parseVector(data.embedding as string | number[]);
        if (vector) {
          // Fire and forget: the hit is already served, and making the caller
          // wait on a bookkeeping write would spend latency for nothing. Only
          // the timestamp is kept, and only so pruning knows what is cold.
          void db
            .from('query_embeddings')
            .update({ last_used_at: new Date().toISOString() })
            .eq('query_hash', hash)
            .then(() => undefined, () => undefined);
          return vector;
        }
      }
    } catch {
      // Fall through to Voyage.
    }
  }

  const vector = await embedOne(query, 'query');

  if (db) {
    void db
      .from('query_embeddings')
      .upsert(
        {
          query_hash: hash,
          model: EMBEDDING_MODEL,
          embedding: toVectorLiteral(vector)
        },
        { onConflict: 'query_hash' }
      )
      .then(() => undefined, () => undefined);
  }

  return vector;
}

/** pgvector returns `[1,2,3]` as text over PostgREST. */
function parseVector(value: string | number[]): number[] | null {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}
