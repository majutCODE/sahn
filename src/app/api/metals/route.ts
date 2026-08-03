import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import type { SpotPrice } from '@/lib/zakat';

/**
 * Gold and silver spot, for the nisab.
 *
 * Cached for a day: the nisab does not need to be minute-accurate, the free
 * tier is metered, and a stable figure means two people calculating on the
 * same day get the same threshold.
 */
export const revalidate = 86_400;

const querySchema = z.object({
  currency: z.string().length(3).default('GBP')
});

export async function GET(request: NextRequest) {
  const params = querySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  );
  if (!params.success) {
    return NextResponse.json({ error: 'invalid_currency' }, { status: 400 });
  }

  const key = process.env.METALS_API_KEY;
  const provider = process.env.METALS_PROVIDER;
  if (!key || provider !== 'metals_dev') {
    return NextResponse.json({ error: 'metals_not_configured' }, { status: 503 });
  }

  const currency = params.data.currency.toUpperCase();

  try {
    const response = await fetch(
      `https://api.metals.dev/v1/latest?api_key=${key}&currency=${currency}&unit=toz`,
      { next: { revalidate } }
    );
    if (!response.ok) throw new Error(String(response.status));

    const json = (await response.json()) as {
      status: string;
      metals?: { gold: number; silver: number };
      error_message?: string;
    };
    if (json.status !== 'success' || !json.metals) {
      throw new Error(json.error_message ?? 'bad_response');
    }

    const spot: SpotPrice = {
      gold: json.metals.gold,
      silver: json.metals.silver,
      currency,
      fetchedAt: new Date().toISOString()
    };

    return NextResponse.json({ spot });
  } catch {
    return NextResponse.json({ error: 'metals_unavailable' }, { status: 503 });
  }
}
