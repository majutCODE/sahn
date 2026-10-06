import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { reportError } from '@/lib/observability/report';
import { surahByNumber } from '@/lib/hifz';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const addSchema = z
  .object({
    surah: z.number().int().min(1).max(114),
    ayah_from: z.number().int().min(1),
    ayah_to: z.number().int().min(1)
  })
  .refine((v) => v.ayah_to >= v.ayah_from, 'Range is reversed')
  .refine(
    // The database constrains the shape of a range; only the application
    // knows that al-Fatiha stops at seven.
    (v) => v.ayah_to <= (surahByNumber(v.surah)?.ayat ?? 0),
    'Range runs past the end of the surah'
  );

const reviewSchema = z.object({
  id: z.string().uuid(),
  confident: z.boolean()
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { data, error } = await supabase
    .from('hifz_portions')
    .select('id, surah, ayah_from, ayah_to, strength, last_reviewed_at, next_review_at')
    .eq('user_id', user.id)
    .order('surah')
    .order('ayah_from');

  if (error) return NextResponse.json({ error: 'read_failed' }, { status: 500 });
  return NextResponse.json({ portions: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = addSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: 'invalid_range', detail: body.error.issues[0]?.message },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('hifz_portions')
    .upsert(
      { user_id: user.id, ...body.data },
      { onConflict: 'user_id,surah,ayah_from,ayah_to' }
    )
    .select('id, surah, ayah_from, ayah_to, strength, last_reviewed_at, next_review_at')
    .single();

  if (error) {
    void reportError('tracker', new Error(error.message), 'adding a hifz portion');
    return NextResponse.json({ error: 'write_failed' }, { status: 500 });
  }
  return NextResponse.json({ portion: data });
}

/** Records a review, which is what moves the schedule. */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  // The interval lives in the database so that a review is one statement and
  // the schedule cannot be computed two different ways by two callers.
  const { error } = await supabase.rpc('hifz_review', {
    p_id: body.data.id,
    p_confident: body.data.confident
  });

  if (error) return NextResponse.json({ error: 'write_failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  const { error } = await supabase
    .from('hifz_portions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
