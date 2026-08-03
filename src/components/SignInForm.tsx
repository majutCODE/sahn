'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';

const schema = z.object({ email: z.email() });

type State = 'idle' | 'sending' | 'sent' | 'error';

/**
 * Email link sign-in. No passwords anywhere in Sahn — one less thing to leak,
 * and worship data is the most private data the product holds.
 */
export default function SignInForm() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      setState('error');
      return;
    }

    setState('sending');
    // The browser's own origin wins. Preferring NEXT_PUBLIC_SITE_URL sent every
    // local magic link to whatever that variable said — port 3000 — while the
    // dev server was actually on a different port, so the link landed nowhere.
    // The env var is only a fallback for non-browser contexts.
    const origin = window.location.origin || process.env.NEXT_PUBLIC_SITE_URL;
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/${locale}`
      }
    });

    setState(error ? 'error' : 'sent');
  }

  return (
    <section className="mx-auto max-w-md px-5 py-12 sm:px-8 sm:py-16">
      <h1 className="font-display text-3xl text-ink">{t('title')}</h1>
      <p className="mt-3 text-sm text-muted">{t('body')}</p>

      {state === 'sent' ? (
        <p
          role="status"
          className="mt-8 border-s-2 border-glaze ps-4 text-sm text-ink"
        >
          {t('sent', { email })}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-3" noValidate>
          <label htmlFor="email" className="text-sm text-ink">
            {t('emailLabel')}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            dir="ltr"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={state === 'error' || undefined}
            className="border border-line bg-raised px-3 py-2.5 text-ink text-start placeholder:text-muted"
            placeholder={t('emailPlaceholder')}
          />
          {state === 'error' && (
            <p role="alert" className="text-sm text-clay">
              {t('error')}
            </p>
          )}
          <button
            type="submit"
            disabled={state === 'sending'}
            className="mt-1 border border-glaze bg-glaze px-4 py-2.5 text-sm text-on-glaze transition-colors hover:bg-transparent hover:text-glaze disabled:opacity-60"
          >
            {state === 'sending' ? t('sending') : t('submit')}
          </button>
        </form>
      )}
    </section>
  );
}
