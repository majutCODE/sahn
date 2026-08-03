import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

/**
 * Chat threads. Every row is RLS-scoped to its owner — a signed-out user has
 * no threads at all, which is also what incognito relies on: it simply never
 * creates one.
 */

const createSchema = z.object({
  title: z.string().min(1).max(200),
  module: z.string().max(40).nullable().optional()
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ threads: [] });

  const { data, error } = await supabase
    .from('chat_threads')
    .select('id, title, module, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: 'read_failed' }, { status: 500 });
  return NextResponse.json({ threads: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = createSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('chat_threads')
    .insert({
      user_id: user.id,
      title: body.data.title.slice(0, 200),
      module: body.data.module ?? null
    })
    .select('id, title, created_at')
    .single();

  if (error) return NextResponse.json({ error: 'write_failed' }, { status: 500 });
  return NextResponse.json({ thread: data });
}
