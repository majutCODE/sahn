import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { ASSET_KINDS, LIABILITY_KINDS } from '@/lib/zakat';

const amountMap = (keys: readonly string[]) =>
  z.record(z.enum(keys as [string, ...string[]]), z.number().nonnegative()).default({});

const saveSchema = z.object({
  assets: amountMap(ASSET_KINDS),
  liabilities: amountMap(LIABILITY_KINDS),
  nisabBasis: z.enum(['gold', 'silver']),
  // The spot price is stored with the record rather than looked up later: a
  // calculation has to remain reproducible on the day it was made.
  spotPrice: z.object({
    gold: z.number().positive(),
    silver: z.number().positive(),
    currency: z.string().length(3),
    fetchedAt: z.string()
  }),
  currency: z.string().length(3),
  amountDue: z.number().nonnegative(),
  hawlDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { data, error } = await supabase
    .from('zakat_records')
    .select(
      'id, calculated_at, hawl_date, assets, liabilities, nisab_basis, spot_price, currency, amount_due'
    )
    .eq('user_id', user.id)
    .order('calculated_at', { ascending: false })
    .limit(24);

  if (error) return NextResponse.json({ error: 'read_failed' }, { status: 500 });
  return NextResponse.json({ records: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = saveSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const { error } = await supabase.from('zakat_records').insert({
    user_id: user.id,
    hawl_date: body.data.hawlDate,
    assets: body.data.assets,
    liabilities: body.data.liabilities,
    nisab_basis: body.data.nisabBasis,
    spot_price: body.data.spotPrice,
    currency: body.data.currency,
    amount_due: body.data.amountDue
  });

  if (error) return NextResponse.json({ error: 'write_failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
