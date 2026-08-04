import Anthropic from '@anthropic-ai/sdk';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { locales, type Locale } from '@/i18n/routing';
import { MisconfiguredError, classify } from '@/lib/chat/classify';
import { crisisResources } from '@/lib/chat/crisis';
import { counselPrompt, sensitiveResponse } from '@/lib/chat/prompts';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { formatPassages, searchSources } from '@/lib/search/retrieve';
import { requestCountry } from '@/lib/geo';
import { reportError } from '@/lib/observability/report';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const COUNSEL_MODEL = 'claude-sonnet-5';

const bodySchema = z.object({
  message: z.string().min(1).max(8000),
  locale: z.enum(locales),
  country: z.string().length(2).optional(),
  /**
   * Prior turns, sent by the client each time.
   *
   * Counsel has no server-side thread to read history from — that is the
   * point — so continuity has to travel with the request. Capped so a long
   * session cannot be used to push an unbounded prompt.
   */
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(8000)
      })
    )
    .max(40)
    .optional()
});

/**
 * Counsel mode.
 *
 * Two things make this different from /api/chat, and neither is the model:
 *
 * Nothing is written. There is no thread, no message row, no title. A saved
 * transcript is encrypted in the browser and posted separately as ciphertext,
 * so this route never has anywhere to put plaintext even by mistake.
 *
 * The safety floor is unchanged. The same classifier, the same deterministic
 * pre-filter, and the same written crisis copy returned without calling a
 * model. A gentler register must not mean a softer route — someone is more
 * likely to disclose here than anywhere else in the product.
 */
export async function POST(request: NextRequest) {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const { message, locale } = body.data;
  const country = requestCountry(request) ?? body.data.country;
  const history = body.data.history ?? [];

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
    if (error instanceof MisconfiguredError) {
      void reportError('counsel', error, 'missing or invalid API key');
      return NextResponse.json({ error: 'not_configured' }, { status: 503 });
    }
    void reportError('classifier', error, 'counsel route');
    return NextResponse.json({ error: 'classifier_unavailable' }, { status: 503 });
  }

  // Identical handling to the main chat route. Crisis copy is written and
  // reviewed; generating it would reintroduce the risk it exists to remove.
  if (route.route === 'sensitive') {
    return NextResponse.json({
      route: 'sensitive',
      category: route.category,
      crisis: route.crisis,
      text: sensitiveResponse(locale as Locale, route.category),
      resources: route.crisis
        ? crisisResources(route.category!, country).helplines
        : []
    });
  }

  let passages = '';
  if (route.islamic) {
    try {
      // Fewer than the chat route retrieves: this is a conversation, and a
      // wall of quoted text is the opposite of what the register needs.
      passages = formatPassages(await searchSources(message, { limit: 3 }));
    } catch {
      passages = '';
    }
  }

  const client = new Anthropic();
  const stream = client.messages.stream({
    model: COUNSEL_MODEL,
    max_tokens: 8000,
    system: counselPrompt(locale as Locale, passages),
    messages: [...history, { role: 'user' as const, content: message }]
  });

  const encoder = new TextEncoder();
  const sse = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );

      send('route', { route: 'counsel' });

      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            send('delta', { text: event.delta.text });
          }
        }
        await stream.finalMessage();
        send('done', {});
      } catch (error) {
        send('error', {
          message: error instanceof Error ? error.message : 'stream_failed'
        });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(sse, {
    headers: {
      ...rateLimitHeaders(verdict),
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      // Nothing here should sit in any cache, anywhere, ever.
      'x-robots-tag': 'noindex'
    }
  });
}
