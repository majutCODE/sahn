import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { PRAYERS } from '@/lib/prayer';
import { PRAYER_STATUSES, type PrayerLog } from '@/lib/tracker';

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

  if (status === null) {
    const { error } = await supabase
      .from('prayer_logs')
      .delete()
      .eq('user_id', user.id)
      .eq('date', date)
      .eq('prayer', prayer);
    if (error) return NextResponse.json({ error: 'write_failed' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from('prayer_logs')
    .upsert(
      { user_id: user.id, date, prayer, status },
      { onConflict: 'user_id,date,prayer' }
    );

  if (error) return NextResponse.json({ error: 'write_failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
