import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { MissedFasts, RamadanDay } from '@/lib/ramadan';

const yearSchema = z.coerce.number().int().min(1400).max(1600);

const daySchema = z.object({
  hijri_year: yearSchema,
  day: z.number().int().min(1).max(30),
  // null everywhere means "not answered", which a person must be able to get
  // back to after tapping something by mistake.
  fasted: z.boolean().nullable().optional(),
  taraweeh: z.boolean().nullable().optional(),
  juz_read: z.number().int().min(1).max(30).nullable().optional(),
  reflection: z.string().max(4000).nullable().optional()
});

const missedSchema = z.object({
  hijri_year: yearSchema,
  count: z.number().int().min(0).max(400).optional(),
  made_up: z.number().int().min(0).max(400).optional(),
  fidya_paid: z.boolean().optional()
});

export type RamadanResponse = { days: RamadanDay[]; missed: MissedFasts };

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const year = yearSchema.safeParse(new URL(request.url).searchParams.get('year'));
  if (!year.success) {
    return NextResponse.json({ error: 'invalid_year' }, { status: 400 });
  }

  const [days, missed] = await Promise.all([
    supabase
      .from('ramadan_days')
      .select('day, fasted, taraweeh, juz_read, reflection')
      .eq('user_id', user.id)
      .eq('hijri_year', year.data)
      .order('day'),
    supabase
      .from('missed_fasts')
      .select('hijri_year, count, made_up, fidya_paid')
      .eq('user_id', user.id)
      .eq('hijri_year', year.data)
      .maybeSingle()
  ]);

  if (days.error) {
    return NextResponse.json({ error: 'read_failed' }, { status: 500 });
  }

  return NextResponse.json({
    days: (days.data ?? []) as RamadanDay[],
    // A year with nothing recorded is an empty ledger, not an error.
    missed: (missed.data as MissedFasts | null) ?? {
      hijri_year: year.data,
      count: 0,
      made_up: 0,
      fidya_paid: false
    }
  } satisfies RamadanResponse);
}

/** Records one day. Partial: only the field that changed is sent. */
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = daySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const { error } = await supabase.from('ramadan_days').upsert(
    { user_id: user.id, ...body.data },
    // The table's unique key is (user, year, day); without naming it here the
    // upsert would insert a second row for the same day.
    { onConflict: 'user_id,hijri_year,day' }
  );

  if (error) {
    return NextResponse.json({ error: 'write_failed' }, { status: 500 });
  }
  return NextResponse.json({ saved: true });
}

/** Records the missed-fast ledger for a year. */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = missedSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const { error } = await supabase
    .from('missed_fasts')
    .upsert({ user_id: user.id, ...body.data }, { onConflict: 'user_id,hijri_year' });

  if (error) {
    return NextResponse.json({ error: 'write_failed' }, { status: 500 });
  }
  return NextResponse.json({ saved: true });
}
