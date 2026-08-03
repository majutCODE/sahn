'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Who you are, and how to leave.
 *
 * Without this there is no way to tell a signed-in session from a signed-out
 * one — the magic link creates the account silently and lands you back on the
 * home screen looking exactly as before, which reads as "nothing happened".
 */
export default function AccountMenu() {
  const t = useTranslations('account');
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setReady(true);
    });

    // The session can arrive after first paint — the callback sets the cookie
    // and redirects, so without this the sidebar keeps saying "signed out"
    // until a manual refresh.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    setEmail(null);
    // Refresh so server components drop any user-scoped data they rendered.
    router.refresh();
  }

  if (!ready) return <div className="h-9" aria-hidden="true" />;

  if (!email) {
    return (
      <Link
        href="/sign-in"
        className="block rounded-sm border border-line px-3 py-2 text-center text-sm text-ink transition-colors hover:border-glaze"
      >
        {t('signIn')}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-glaze text-xs text-on-glaze"
      >
        {email[0]?.toUpperCase()}
      </span>
      <Link
        href="/account"
        title={email}
        className="min-w-0 flex-1 truncate text-xs text-muted hover:text-ink"
      >
        {email}
      </Link>
      <button
        type="button"
        onClick={signOut}
        className="shrink-0 text-xs text-muted underline underline-offset-2 hover:text-ink"
      >
        {t('signOut')}
      </button>
    </div>
  );
}
