import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { reportError } from '@/lib/observability/report';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const schema = z.object({
  /** The account's own email address, typed by hand. */
  confirm: z.string().min(1)
});

/**
 * Deletes the account and everything attached to it.
 *
 * The row deletion is not done here. Every user-owned table references
 * auth.users with `on delete cascade`, so removing the auth user removes the
 * records as a database operation — which cannot miss a table the way a
 * hand-written list of deletes eventually does.
 *
 * Confirmation is the account's own email address rather than a word like
 * "delete": a person who mistypes their way through a modal has not confirmed
 * anything, and this is not recoverable.
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'not_signed_in' }, { status: 401 });
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const typed = body.data.confirm.trim().toLowerCase();
  if (!user.email || typed !== user.email.toLowerCase()) {
    return NextResponse.json({ error: 'confirmation_mismatch' }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    void reportError('account', new Error('service role not configured'), 'account deletion is unavailable');
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  // Deleting a user is an admin operation; a session token cannot do it, which
  // is the correct arrangement — but it means the id must come from the
  // verified session above and never from the request body.
  const admin = createAdminClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    void reportError('account', error, 'deleting a user');
    return NextResponse.json({ error: 'delete_failed' }, { status: 503 });
  }

  // Clear the cookies too, or the browser keeps presenting a session for an
  // account that no longer exists.
  await supabase.auth.signOut();

  return NextResponse.json({ deleted: true });
}
