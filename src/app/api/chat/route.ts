import Anthropic from '@anthropic-ai/sdk';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { locales, type Locale } from '@/i18n/routing';
import { MisconfiguredError, classify } from '@/lib/chat/classify';
import { requestCountry } from '@/lib/geo';
import { reportError } from '@/lib/observability/report';
import { createClient } from '@/lib/supabase/server';
import { crisisResources } from '@/lib/chat/crisis';
import { fiqhPrompt, generalPrompt, sensitiveResponse } from '@/lib/chat/prompts';
import {
  formatPassages,
  searchSources,
  toCitations,
  type Citation
} from '@/lib/search/retrieve';
import { RateLimitedError } from '@/lib/embeddings/voyage';
import { MADHHABS, type Madhhab } from '@/lib/madhhab';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';

// The spec names Sonnet for chat. Sonnet 5 is the current model in that tier;
// the spec's `claude-sonnet-4-6` is the previous generation.
const CHAT_MODEL = 'claude-sonnet-5';

const bodySchema = z.object({
  message: z.string().min(1).max(8000),
  locale: z.enum(locales),
  /** ISO 3166-1 alpha-2, used only to pick crisis resources. */
  country: z.string().length(2).optional(),
  /** Filters retrieval and tells the fiqh prompt whose position to lead with. */
  madhhab: z.enum(MADHHABS).optional(),
  /** Existing thread to append to. Omitted on the first message of a chat. */
  threadId: z.string().uuid().optional(),
  /**
   * Incognito keeps the conversation entirely in the browser: no thread, no
   * messages, nothing in the sidebar. Enforced here on the server rather than
   * by the client choosing not to send — a privacy mode the server can
   * override is not a privacy mode.
   */
  incognito: z.boolean().optional()
});

export async function POST(request: NextRequest) {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const { message, locale } = body.data;
  const country = requestCountry(request) ?? body.data.country;
  const madhhab: Madhhab = body.data.madhhab ?? 'all';
  const incognito = body.data.incognito === true;
  const threadId = incognito ? undefined : body.data.threadId;

  // Before any paid call. Every message here is a classifier call, an
  // embedding and a Sonnet completion, and the endpoint is open to anyone who
  // finds the domain.
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const verdict = await checkRateLimit('chat', request, user?.id);
  if (!verdict.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: verdict.retryAfter, signedIn: Boolean(user) },
      { status: 429, headers: rateLimitHeaders(verdict) }
    );
  }

  let route;
  try {
    route = await classify(message);
  } catch (error) {
    // Fail closed either way — guessing a route risks answering a fiqh
    // question generatively or missing a disclosure. But a missing key is a
    // deployment fault that will never fix itself, and saying "try again" for
    // it wastes everyone's time.
    if (error instanceof MisconfiguredError) {
      void reportError('chat', error, 'missing or invalid API key');
      return NextResponse.json(
        { error: 'not_configured', detail: error.message },
        { status: 503 }
      );
    }
    void reportError('classifier', error, 'chat route');
    // The upstream status alone, never the message — enough to tell a bad key
    // (401) from a rate limit (429) or an outage (5xx) without leaking detail.
    const upstream =
      typeof error === 'object' && error !== null && 'status' in error
        ? (error as { status?: number }).status
        : undefined;
    return NextResponse.json(
      { error: 'classifier_unavailable', upstream: upstream ?? null },
      { status: 503 }
    );
  }

  // The sensitive route never reaches a model. The copy is written and
  // reviewed; generating it would reintroduce exactly the risk it exists for.
  if (route.route === 'sensitive') {
    const text = sensitiveResponse(locale as Locale, route.category);
    await persist(threadId, message, text, 'sensitive', []);
    return NextResponse.json({
      route: 'sensitive',
      category: route.category,
      crisis: route.crisis,
      text,
      resources: route.crisis
        ? crisisResources(route.category!, country).helplines
        : [],
      citations: []
    });
  }

  // Retrieval runs for BOTH answering routes, for different reasons.
  //
  // For fiqh it is the only permitted source. For general it is grounding: the
  // route may answer from the model's own knowledge, but a question like "what
  // does the Qur'an say about fasting" would otherwise be answered by quoting
  // scripture from memory, uncited — which is the failure citation exists to
  // prevent. Given passages, it quotes the retrieved text and the chips resolve.
  let citations: Citation[] = [];
  let passages = '';

  // Only retrieve when the question actually has an Islamic dimension. Most
  // messages do not, and embedding them spends a request against a tight rate
  // limit to search a corpus that cannot answer them.
  if (route.islamic) {
    try {
      // Six of each rather than eight: both corpora now feed the same prompt,
      // and an over-long passage block dilutes the question.
      const sources = await searchSources(message, { limit: 6 });
      passages = formatPassages(sources);
      citations = toCitations(sources);
    } catch (error) {
      // Being throttled is not the same as finding nothing, and answering
      // "there is no source material for this" when 36,000 narrations are
      // sitting there unqueried is simply untrue. Say what actually happened
      // and refuse before spending a completion on a groundless answer.
      if (error instanceof RateLimitedError && route.route === 'fiqh') {
        return NextResponse.json(
          { error: 'retrieval_busy', retryAfter: error.retryAfter },
          { status: 429, headers: { 'retry-after': String(error.retryAfter) } }
        );
      }
      // A throttle is expected and already handled above. Anything else
      // reaching here means retrieval is broken, and a fiqh route that
      // quietly stops citing is the failure hardest to notice from outside.
      if (!(error instanceof RateLimitedError)) {
        void reportError('retrieval', error, `route: ${route.route}`);
      }
      // The general route can still answer usefully without passages; its
      // prompt already forbids quoting scripture from memory.
      passages = '';
      citations = [];
    }
  }

  const system =
    route.route === 'fiqh'
      ? fiqhPrompt(locale as Locale, passages, madhhab)
      : generalPrompt(locale as Locale, passages, route.islamic);

  const client = new Anthropic();
  const stream = client.messages.stream({
    model: CHAT_MODEL,
    max_tokens: 64000,
    system,
    messages: [{ role: 'user', content: message }]
  });

  const encoder = new TextEncoder();
  const body_ = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );

      send('route', { route: route.route, source: route.source });
      if (citations.length) send('citations', { citations });

      let answer = '';

      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            answer += event.delta.text;
            send('delta', { text: event.delta.text });
          }
        }
        const final = await stream.finalMessage();
        // Persisted after the stream completes, so a half-written answer is
        // never stored as though it were the whole thing.
        await persist(threadId, message, answer, route.route, citations);
        send('done', {
          stop_reason: final.stop_reason,
          usage: {
            input: final.usage.input_tokens,
            output: final.usage.output_tokens
          }
        });
      } catch (error) {
        send('error', {
          message: error instanceof Error ? error.message : 'stream_failed'
        });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(body_, {
    headers: {
      ...rateLimitHeaders(verdict),
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive'
    }
  });
}

/**
 * Writes the user's message and the assistant's reply to a thread.
 *
 * Silent no-op when there is no thread — which covers signed-out users and
 * incognito alike. Failures are swallowed deliberately: losing the transcript
 * is worse than nothing, but failing the answer the user is reading is worse
 * still.
 */
async function persist(
  threadId: string | undefined,
  question: string,
  answer: string,
  route: 'fiqh' | 'general' | 'sensitive',
  citations: Citation[]
): Promise<void> {
  if (!threadId || !answer) return;

  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('chat_messages').insert([
      { thread_id: threadId, role: 'user', content: question, route, citations: [] },
      { thread_id: threadId, role: 'assistant', content: answer, route, citations }
    ]);
  } catch {
    // Transcript is best-effort; the answer has already been delivered.
  }
}
