import 'server-only';

/**
 * Voyage embeddings. Anthropic has no embeddings endpoint, and Voyage is their
 * recommended provider.
 *
 * `voyage-3.5` returns 1024 dimensions, which is what `quran_chunks.embedding`
 * and `dua_entries.embedding` are declared as. Changing the model here means
 * changing those columns and re-embedding the corpus — the dimension is not a
 * detail the database can shrug off.
 */

export const EMBEDDING_MODEL = 'voyage-3.5';
export const EMBEDDING_DIMENSIONS = 1024;

/**
 * Voyage distinguishes the two sides of a retrieval pair. A corpus row is a
 * `document`; a user's question is a `query`. Embedding both the same way
 * measurably weakens the match, so the caller must say which it is.
 */
export type InputType = 'document' | 'query';

/**
 * Voyage refused because the minute's budget is spent.
 *
 * Distinguished from every other failure so the caller can say something true
 * — "wait twenty seconds" — instead of the generic "no sources were found",
 * which is indistinguishable from a corpus that does not contain the answer.
 */
export class RateLimitedError extends Error {
  /** Seconds to wait before the window resets. */
  readonly retryAfter: number;

  constructor(retryAfter = RATE_LIMIT_WINDOW_SECONDS) {
    super('Voyage rate limit reached');
    this.name = 'RateLimitedError';
    this.retryAfter = retryAfter;
  }
}

/**
 * An account with no payment method gets 3 requests per minute in total,
 * across every user of the site. One question needs one embedding, so this is
 * the real ceiling on concurrent use until a card is added.
 */
export const RATE_LIMIT_WINDOW_SECONDS = 20;

/** Voyage caps a request at 128 inputs. */
const MAX_BATCH = 128;

export async function embed(
  texts: string[],
  inputType: InputType
): Promise<number[][]> {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error('VOYAGE_API_KEY is not set');
  if (texts.length === 0) return [];

  const out: number[][] = [];

  for (let i = 0; i < texts.length; i += MAX_BATCH) {
    const batch = texts.slice(i, i + MAX_BATCH);

    const response = await withRetry(async () =>
      fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${key}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          input: batch,
          model: EMBEDDING_MODEL,
          input_type: inputType
        })
      })
    );

    if (response.status === 429) throw new RateLimitedError();

    if (!response.ok) {
      throw new Error(
        `Voyage embedding failed: ${response.status} ${await response.text()}`
      );
    }

    const json = (await response.json()) as {
      data: Array<{ index: number; embedding: number[] }>;
    };

    // Voyage does not guarantee response order matches input order, so results
    // are placed by their own index rather than pushed in arrival order.
    const ordered: number[][] = new Array(batch.length);
    for (const item of json.data) ordered[item.index] = item.embedding;
    out.push(...ordered);
  }

  return out;
}

/**
 * Retries a 429 or 5xx with backoff.
 *
 * This matters more than it looks: on an account with no payment method Voyage
 * allows 3 requests per minute *in total*, so a corpus ingestion running in the
 * background will starve live user queries. Without a retry, every search
 * during an ingest returns an error. A payment method lifts the limit and makes
 * this path a formality — the free token allowance still applies.
 */
async function withRetry(
  send: () => Promise<Response>,
  // One retry, not four. Each 429 retry sleeps 20 seconds, so the old default
  // left someone staring at a spinner for eighty seconds before being told
  // nothing useful. Failing fast and explaining is better than waiting and
  // then failing.
  attempts = 1
): Promise<Response> {
  let response = await send();
  for (let i = 0; i < attempts && !ok(response); i += 1) {
    // 429 means the current minute's budget is gone; a short retry just spends
    // another request against the same window.
    await sleep(response.status === 429 ? 20_000 : 1000 * 2 ** i);
    response = await send();
  }
  return response;
}

const ok = (r: Response) => r.ok || (r.status !== 429 && r.status < 500);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function embedOne(
  text: string,
  inputType: InputType
): Promise<number[]> {
  const [vector] = await embed([text], inputType);
  return vector;
}

/** pgvector's text input format. */
export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(',')}]`;
}
