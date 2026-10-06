import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { PRAYERS } from '@/lib/prayer';
import { PRAYER_STATUSES, type PrayerLog, type PrayerStatus } from '@/lib/tracker';
import { reportError } from '@/lib/observability/report';
import type { Prayer } from '@/lib/prayer';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

const querySchema = z.object({
  from: dateSchema,
  to: dateSchema
});

const writeSchema = z.object({
  date: dateSchema,
  prayer: z.enum(PRAYERS),
  // null clears a slot back to unlogged, which a user must be able to do.
  status: z.enum(PRAYER_STATUSES).nullable()
});

export type PrayerLogsResponse = { logs: PrayerLog[] };

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const params = querySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  );
  if (!params.success) {
    return NextResponse.json({ error: 'invalid_range' }, { status: 400 });
  }

  // RLS already restricts this to the caller's rows; the user_id filter is
  // belt and braces, not the security boundary.
  const { data, error } = await supabase
    .from('prayer_logs')
    .select('date, prayer, status')
    .eq('user_id', user.id)
    .gte('date', params.data.from)
    .lte('date', params.data.to);

  if (error) {
    return NextResponse.json({ error: 'read_failed' }, { status: 500 });
  }

  return NextResponse.json({ logs: data as PrayerLog[] } satisfies PrayerLogsResponse);
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

  const { date, prayer, status } = body.data;

  // The ledger moves by the difference between what this prayer was and what
  // it is becoming, so the previous status has to be read before the write.
  // Without it, marking a prayer missed twice would owe two prayers, and
  // correcting a mistake would owe one forever.
  const { data: existing } = await supabase
    .from('prayer_logs')
    .select('status')
    .eq('user_id', user.id)
    .eq('date', date)
    .eq('prayer', prayer)
    .maybeSingle();

  const previous = (existing?.status ?? null) as PrayerStatus | null;

  if (status === null) {
    const { error } = await supabase
      .from('prayer_logs')
      .delete()
      .eq('user_id', user.id)
      .eq('date', date)
      .eq('prayer', prayer);
    if (error) return NextResponse.json({ error: 'write_failed' }, { status: 500 });
    await adjustQada(supabase, prayer, previous, null);
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from('prayer_logs')
    .upsert(
      { user_id: user.id, date, prayer, status },
      { onConflict: 'user_id,date,prayer' }
    );

  if (error) return NextResponse.json({ error: 'write_failed' }, { status: 500 });

  await adjustQada(supabase, prayer, previous, status);
  return NextResponse.json({ ok: true });
}

/**
 * Keeps the qada ledger in step with the tracker.
 *
 * Awaited rather than fired and forgotten: the client refetches the ledger
 * straight after this responds, and a ledger that updates a beat later would
 * show the old number and look broken.
 *
 * A failure here is logged and swallowed. The log itself is already written,
 * and failing the request would make the user think their prayer was not
 * recorded when it was.
 */
async function adjustQada(
  supabase: Awaited<ReturnType<typeof createClient>>,
  prayer: Prayer,
  previous: PrayerStatus | null,
  next: PrayerStatus | null
): Promise<void> {
  if (previous === next) return;

  const { error } = await supabase.rpc('apply_qada_delta', {
    p_prayer: prayer,
    p_old_status: previous,
    p_new_status: next
  });

  if (error) void reportError('tracker', new Error(error.message), 'adjusting the qada ledger');
}
