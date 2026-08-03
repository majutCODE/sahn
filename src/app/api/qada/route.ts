import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { PRAYERS } from '@/lib/prayer';
import type { QadaEntry } from '@/lib/tracker';

const writeSchema = z.object({
  prayer: z.enum(PRAYERS),
  owed: z.number().int().min(0).max(100_000),
  madeUp: z.number().int().min(0).max(100_000)
});

export type QadaResponse = { entries: QadaEntry[] };

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { data, error } = await supabase
    .from('qada_ledger')
    .select('prayer_type, count_owed, count_made_up')
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: 'read_failed' }, { status: 500 });

  const byPrayer = new Map(data.map((row) => [row.prayer_type, row]));
  const entries: QadaEntry[] = PRAYERS.map((prayer) => {
    const row = byPrayer.get(prayer);
    return {
      prayer,
      owed: row?.count_owed ?? 0,
      madeUp: row?.count_made_up ?? 0
    };
  });

  return NextResponse.json({ entries } satisfies QadaResponse);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = writeSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const { prayer, owed, madeUp } = body.data;

  const { error } = await supabase.from('qada_ledger').upsert(
    {
      user_id: user.id,
      prayer_type: prayer,
      count_owed: owed,
      count_made_up: madeUp,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id,prayer_type' }
  );

  if (error) return NextResponse.json({ error: 'write_failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
