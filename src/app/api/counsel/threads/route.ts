import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const saveSchema = z.object({
  /** Base64 of the encrypted blob produced in the browser. */
  content: z.string().min(1).max(2_000_000)
});

/**
 * Postgres bytea travels over PostgREST as a hex-escaped string. The browser
 * speaks base64, so the two are converted here rather than making either side
 * deal with the other's format.
 */
const toHex = (base64: string) => `\\x${Buffer.from(base64, 'base64').toString('hex')}`;
const toBase64 = (hex: string) =>
  Buffer.from(hex.replace(/^\\x/, ''), 'hex').toString('base64');

/** Saved counsel transcripts, still encrypted. The server cannot read them. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { data, error } = await supabase
    .from('counsel_threads')
    .select('id, encrypted_content, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'read_failed' }, { status: 500 });

  return NextResponse.json({
    threads: (data ?? []).map((row) => ({
      id: row.id,
      created_at: row.created_at,
      content: toBase64(row.encrypted_content as string)
    }))
  });
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

  const { data, error } = await supabase
    .from('counsel_threads')
    .insert({ user_id: user.id, encrypted_content: toHex(body.data.content) })
    .select('id, created_at')
    .single();

  if (error) {
    console.error('[counsel] save failed:', error.message);
    return NextResponse.json({ error: 'write_failed' }, { status: 500 });
  }

  return NextResponse.json({ thread: data });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  // RLS restricts this to the caller's rows; the user_id filter is belt and
  // braces, not the boundary.
  const { error } = await supabase
    .from('counsel_threads')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
