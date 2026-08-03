import { NextResponse } from 'next/server';
import { EXPORTED_TABLES } from '@/lib/account';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';


/**
 * A complete copy of everything Sahn holds about you, as a file.
 *
 * Read through the caller's own session, so row-level security decides what
 * comes back. A bug here cannot leak another person's records because the
 * query is not privileged.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'not_signed_in' }, { status: 401 });
  }

  const data: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at
    }
  };

  for (const table of EXPORTED_TABLES) {
    const { data: rows, error } = await supabase.from(table).select('*');
    // Report the failure inside the file rather than dropping the table
    // silently — a gap the reader can see beats a gap they cannot.
    data[table] = error ? { error: error.message } : (rows ?? []);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="sahn-export-${stamp}.json"`,
      'cache-control': 'no-store'
    }
  });
}
