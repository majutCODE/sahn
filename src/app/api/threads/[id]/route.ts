import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const idSchema = z.string().uuid();

/** Messages in one thread. RLS on chat_messages inherits ownership from the thread. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, role, content, route, citations, created_at')
    .eq('thread_id', id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: 'read_failed' }, { status: 500 });

  // RLS returns an empty set for someone else's thread rather than an error, so
  // an empty result is indistinguishable from "not yours" — which is the point.
  return NextResponse.json({ messages: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  // chat_messages cascades from the thread, so this removes the whole
  // conversation rather than orphaning its messages.
  const { error } = await supabase
    .from('chat_threads')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
