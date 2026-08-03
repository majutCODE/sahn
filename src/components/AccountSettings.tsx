'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';

type Stage = 'idle' | 'confirming' | 'deleting' | 'failed';

/**
 * Export and deletion, the two rights that should not require emailing anyone.
 */
export default function AccountSettings() {
  const t = useTranslations('account');
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [stage, setStage] = useState<Stage>('idle');
  const [typed, setTyped] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function remove() {
    setStage('deleting');
    const res = await fetch('/api/account', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ confirm: typed })
    }).catch(() => null);

    if (!res?.ok) {
      setStage('failed');
      return;
    }

    // Sign the browser out as well, then go home. Leaving them on a settings
    // page for an account that no longer exists is a strange place to end.
    await createClient().auth.signOut();
    router.replace('/');
    router.refresh();
  }

  if (!ready) return <div className="h-32" aria-hidden="true" />;

  if (!email) {
    return (
      <p className="mt-6 text-sm text-muted">
        {t('signedOutNote')}{' '}
        <Link href="/sign-in" className="text-glaze underline underline-offset-2">
          {t('signIn')}
        </Link>
      </p>
    );
  }

  const confirmed = typed.trim().toLowerCase() === email.toLowerCase();

  return (
    <div className="mt-8">
      <section>
        <h2 className="font-display text-xl text-ink">{t('signedInAs')}</h2>
        <p className="mt-2 text-sm text-ink" dir="ltr">
          {email}
        </p>
      </section>

      <section className="mt-10 border-t border-line pt-8">
        <h2 className="font-display text-xl text-ink">{t('exportHeading')}</h2>
        <p className="mt-2 max-w-prose text-sm text-muted">{t('exportBody')}</p>
        <a
          href="/api/account/export"
          download
          className="mt-4 inline-block border border-line px-4 py-2.5 text-sm text-ink transition-colors hover:border-glaze"
        >
          {t('exportAction')}
        </a>
      </section>

      <section className="mt-10 border-t border-line pt-8">
        <h2 className="font-display text-xl text-clay">{t('deleteHeading')}</h2>
        <p className="mt-2 max-w-prose text-sm text-muted">{t('deleteBody')}</p>

        {stage === 'idle' ? (
          <button
            type="button"
            onClick={() => setStage('confirming')}
            className="mt-4 border border-clay px-4 py-2.5 text-sm text-clay transition-colors hover:bg-clay hover:text-raised"
          >
            {t('deleteAction')}
          </button>
        ) : (
          <div className="mt-4 border border-clay p-4">
            <label htmlFor="confirm" className="block text-sm text-ink">
              {t('deleteConfirmLabel', { email })}
            </label>
            <input
              id="confirm"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              dir="ltr"
              autoComplete="off"
              className="mt-2 w-full border border-line bg-raised px-3 py-2.5 text-ink text-start"
            />
            {stage === 'failed' && (
              <p role="alert" className="mt-3 text-sm text-clay">
                {t('deleteFailed')}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!confirmed || stage === 'deleting'}
                onClick={remove}
                className="border border-clay bg-clay px-4 py-2.5 text-sm text-raised transition-opacity disabled:opacity-50"
              >
                {stage === 'deleting' ? t('deleting') : t('deleteConfirmAction')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStage('idle');
                  setTyped('');
                }}
                className="border border-line px-4 py-2.5 text-sm text-muted hover:text-ink"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
